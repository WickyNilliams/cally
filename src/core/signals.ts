/**
 * A tiny push-based reactivity system: `Signal` holds a value, `effect`
 * re-runs when any signal it read changes. Effects are batched on a
 * microtask. No computed/derived caching - derived values are plain
 * functions that read signals, recomputed inside each effect.
 */

type Subscribers = Set<Effect>;

let active: Effect | undefined;
const queue = new Set<Effect>();
let scheduled = false;

function flush() {
  // additions during iteration are picked up by the loop
  for (const e of queue) {
    queue.delete(e);
    e.run();
  }
  scheduled = false;
}

function schedule(subscribers: Subscribers) {
  for (const e of subscribers) {
    queue.add(e);
  }
  if (!scheduled && queue.size) {
    scheduled = true;
    queueMicrotask(flush);
  }
}

class Effect {
  #deps: Subscribers[] = [];

  constructor(private fn: () => void) {
    this.run();
  }

  track(subscribers: Subscribers) {
    subscribers.add(this);
    this.#deps.push(subscribers);
  }

  run() {
    this.#cleanup();
    const prev = active;
    active = this;
    try {
      this.fn();
    } finally {
      active = prev;
    }
  }

  #cleanup() {
    for (const dep of this.#deps) {
      dep.delete(this);
    }
    this.#deps = [];
  }

  dispose = () => {
    this.#cleanup();
    queue.delete(this);
    this.fn = () => {};
  };
}

export class Signal<T> {
  #subscribers: Subscribers = new Set();

  constructor(private v: T) {}

  get(): T {
    active?.track(this.#subscribers);
    return this.v;
  }

  set(value: T) {
    if (value === this.v) return;
    this.v = value;
    schedule(this.#subscribers);
  }

  peek(): T {
    return this.v;
  }
}

/** Runs `fn` now, and again whenever a signal it read changes. Returns a dispose function */
export function effect(fn: () => void): () => void {
  return new Effect(fn).dispose;
}

/** Read signals without subscribing the current effect to them */
export function untracked<T>(fn: () => T): T {
  const prev = active;
  active = undefined;
  try {
    return fn();
  } finally {
    active = prev;
  }
}

/** Resolves once all pending effects have flushed */
export function tick(): Promise<void> {
  return new Promise((resolve) => {
    const check = () =>
      queue.size || scheduled ? queueMicrotask(check) : resolve();
    check();
  });
}
