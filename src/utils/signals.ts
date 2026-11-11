/**
 * A deliberately tiny signals implementation.
 *
 * The API is a subset of the usual `signal`/`computed`/`effect` trio, with two
 * properties we rely on:
 *
 * - computeds are lazy, so reads are always consistent (no glitches)
 * - effects are deferred to a microtask, so any number of synchronous writes
 *   results in a single run. this includes the first run.
 */

export interface ReadonlySignal<T> {
  readonly value: T;
}

export interface Signal<T> {
  value: T;
}

interface Observer {
  /** the subscriber lists this observer currently sits in */
  deps: Set<Set<Observer>>;
  notify(): void;
}

let active: Observer | undefined;

function track(subs: Set<Observer>) {
  if (active) {
    subs.add(active);
    active.deps.add(subs);
  }
}

// a notified observer drops all its subscriptions, they are re-established
// when it next runs. this means nothing stale is ever kept alive.
function untrack(observer: Observer) {
  for (const subs of observer.deps) subs.delete(observer);
  observer.deps.clear();
}

function notify(subs: Set<Observer>) {
  for (const observer of [...subs]) observer.notify();
}

function run<T>(observer: Observer | undefined, fn: () => T): T {
  const prev = active;
  active = observer;
  try {
    return fn();
  } finally {
    active = prev;
  }
}

export function signal<T>(value: T): Signal<T> {
  const subs = new Set<Observer>();

  return {
    get value() {
      track(subs);
      return value;
    },
    set value(next) {
      if (!Object.is(value, next)) {
        value = next;
        notify(subs);
      }
    },
  };
}

export function computed<T>(fn: () => T): ReadonlySignal<T> {
  const subs = new Set<Observer>();
  let value: T;
  let dirty = true;

  const observer: Observer = {
    deps: new Set(),
    notify() {
      if (!dirty) {
        dirty = true;
        untrack(observer);
        notify(subs);
      }
    },
  };

  return {
    get value() {
      track(subs);
      if (dirty) {
        value = run(observer, fn);
        dirty = false;
      }
      return value;
    },
  };
}

// effects that are waiting to run
let queue: (() => void)[] = [];

function flush() {
  // effects can queue further effects, those run in the same pass
  for (let i = 0; i < queue.length; i++) {
    try {
      queue[i]!();
    } catch (e) {
      // one broken effect should not stop the rest from running
      reportError(e);
    }
  }

  queue = [];
}

/**
 * Runs `fn` in a microtask, and again whenever any signal it read changes.
 * Returns a function to dispose of the effect.
 */
export function effect(fn: () => void): () => void {
  let state = 0; // 0 = idle, 1 = queued, 2 = disposed

  const observer: Observer = {
    deps: new Set(),
    notify() {
      untrack(observer);

      if (!state) {
        state = 1;
        // the first effect to be queued schedules the flush
        if (!queue.length) queueMicrotask(flush);

        queue.push(() => {
          if (state < 2) {
            state = 0;
            run(observer, fn);
          }
        });
      }
    },
  };

  observer.notify();

  return () => {
    state = 2;
    untrack(observer);
  };
}

/** Reads signals without subscribing to them. */
export const untracked = <T>(fn: () => T): T => run(undefined, fn);
