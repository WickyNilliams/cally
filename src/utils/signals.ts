/**
 * A deliberately tiny signals implementation.
 *
 * The API is a subset of the usual `signal`/`computed`/`effect` trio, with two
 * properties we rely on:
 *
 * - computeds are lazy, so reads are always consistent (no glitches)
 * - effects are deferred to a microtask, so any number of synchronous writes
 *   results in a single run. this includes the first run.
 *
 * To keep things small there is no attempt to detect that something was
 * evaluated again only to arrive at the same value. Anything downstream of a
 * change will run.
 */

export interface ReadonlySignal<T> {
  readonly value: T;
}

export interface Signal<T> {
  value: T;
}

interface Observer {
  /** the subscriber lists this observer currently sits in */
  deps: Set<Subscribers>;
  notify(): void;
}

interface Subscribers extends Set<Observer> {
  /** for a computed: lets go of its own dependencies */
  release?(): void;
}

let active: Observer | undefined;

function track(subs: Subscribers) {
  if (active) {
    subs.add(active);
    active.deps.add(subs);
  }
}

/**
 * Removes all of an observer's subscriptions.
 *
 * Subscriptions do not outlive a change. They are dropped, and established
 * afresh by whatever is read when the observer next runs.
 *
 * When an observer is going away for good, we also `release` any computed
 * which is left with no subscribers. Otherwise that computed would remain
 * subscribed to its own dependencies, and be kept alive by them.
 */
function untrack(observer: Observer, release?: boolean) {
  for (const subs of observer.deps) {
    subs.delete(observer);
    if (release && !subs.size) subs.release?.();
  }
  observer.deps.clear();
}

function notify(subs: Subscribers) {
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
  const subs: Subscribers = new Set();

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

const CLEAN = 0;
const DIRTY = 1;
const RUNNING = 2;

export function computed<T>(fn: () => T): ReadonlySignal<T> {
  const subs: Subscribers = new Set();
  // holds the error instead, if `fn` threw
  let value: unknown;
  let failed = false;
  let state = DIRTY;

  const observer: Observer = {
    deps: new Set(),
    notify() {
      if (!state) {
        state = DIRTY;
        untrack(observer);
        notify(subs);
      }
    },
  };

  subs.release = () => {
    state = DIRTY;
    untrack(observer, true);
  };

  return {
    get value() {
      if (state === RUNNING) throw Error("cally: computed reads itself");
      track(subs);

      if (state) {
        state = RUNNING;

        // an error is cached just as a value would be. we remain subscribed to
        // whatever was read before it was thrown, so can recover from it.
        try {
          value = run(observer, fn);
          failed = false;
        } catch (e) {
          value = e;
          failed = true;
        }

        state = CLEAN;
      }

      if (failed) throw value;
      return value as T;
    },
  };
}

// effects that are waiting to run
let queue: (() => void)[] = [];
let flushes = 0;

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
  flushes++;
}

/**
 * Runs `fn` in a microtask, and again whenever any signal it read changes.
 * Returns a function to dispose of the effect.
 */
export function effect(fn: () => void): () => void {
  let queued = false;
  let disposed = false;
  // how many times it has run during a given flush
  let runs = 0;
  let pass = -1;

  const dispose = () => {
    disposed = true;
    untrack(observer, true);
  };

  const job = () => {
    queued = false;

    if (!disposed) {
      if (pass !== flushes) {
        pass = flushes;
        runs = 0;
      }

      // effects which endlessly trigger each other would lock up the page.
      // skipping a run is what breaks the cycle. as its subscriptions are
      // still in place, it gets another go the next time something changes.
      if (++runs > 100) throw Error("cally: effect loop");

      untrack(observer);

      try {
        run(observer, fn);
      } finally {
        // it may have been disposed of while it was running
        if (disposed) dispose();
      }
    }
  };

  const observer: Observer = {
    deps: new Set(),
    notify() {
      if (!queued && !disposed) {
        queued = true;
        // the first effect to be queued schedules the flush
        if (!queue.length) queueMicrotask(flush);
        queue.push(job);
      }
    },
  };

  observer.notify();

  return dispose;
}

/** Reads signals without subscribing to them. */
export const untracked = <T>(fn: () => T): T => run(undefined, fn);
