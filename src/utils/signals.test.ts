import { describe, it, expect, vi, afterEach } from "vitest";
import { createSpy } from "./test.js";
import {
  computed,
  effect,
  signal,
  untracked,
  type ReadonlySignal,
} from "./signals.js";

// effects run in a microtask, and that microtask is queued before this one
const flushed = () => Promise.resolve();

afterEach(() => {
  vi.restoreAllMocks();
});

describe("signal", () => {
  it("holds a value", () => {
    const s = signal(1);
    expect(s.value).toBe(1);

    s.value = 2;
    expect(s.value).toBe(2);
  });
});

describe("computed", () => {
  it("is lazy", () => {
    const s = signal(1);
    const spy = createSpy(() => s.value * 2);
    const c = computed(spy);

    expect(spy.count).toBe(0);
    expect(c.value).toBe(2);
    expect(spy.count).toBe(1);

    // a write alone does not cause any work
    s.value = 2;
    expect(spy.count).toBe(1);
  });

  it("caches its value until a dependency changes", () => {
    const s = signal(1);
    const spy = createSpy(() => s.value * 2);
    const c = computed(spy);

    c.value;
    c.value;
    expect(spy.count).toBe(1);

    s.value = 2;
    expect(c.value).toBe(4);
    expect(c.value).toBe(4);
    expect(spy.count).toBe(2);
  });

  it("ignores a write of the same value", () => {
    const s = signal(NaN);
    const spy = createSpy(() => s.value);
    const c = computed(spy);

    c.value;
    s.value = NaN;
    c.value;

    expect(spy.count).toBe(1);
  });

  it("can depend on other computeds", () => {
    const s = signal(1);
    const a = computed(() => s.value + 1);
    const b = computed(() => a.value + 1);
    const c = computed(() => b.value + 1);

    expect(c.value).toBe(4);
    s.value = 10;
    expect(c.value).toBe(13);
  });

  it("evaluates once for a diamond, and is never inconsistent", () => {
    const s = signal(1);
    const left = computed(() => s.value + 1);
    const right = computed(() => s.value * 10);
    const spy = createSpy(() => `${left.value}:${right.value}`);
    const bottom = computed(spy);

    expect(bottom.value).toBe("2:10");

    s.value = 2;
    expect(bottom.value).toBe("3:20");
    expect(spy.count).toBe(2);
  });

  it("only depends on what it read last time", () => {
    const toggle = signal(true);
    const a = signal("a");
    const b = signal("b");
    const spy = createSpy(() => (toggle.value ? a.value : b.value));
    const c = computed(spy);

    expect(c.value).toBe("a");

    // not a dependency, yet
    b.value = "b2";
    expect(c.value).toBe("a");
    expect(spy.count).toBe(1);

    toggle.value = false;
    expect(c.value).toBe("b2");
    expect(spy.count).toBe(2);

    // no longer a dependency
    a.value = "a2";
    expect(c.value).toBe("b2");
    expect(spy.count).toBe(2);
  });

  it("does not depend on untracked reads", () => {
    const a = signal(1);
    const b = signal(1);
    const c = computed(() => a.value + untracked(() => b.value));

    expect(c.value).toBe(2);

    b.value = 10;
    expect(c.value).toBe(2);

    a.value = 2;
    expect(c.value).toBe(12);
  });

  it("throws if it reads itself, rather than recursing forever", () => {
    const s = signal(0);
    const c: ReadonlySignal<number> = computed(() =>
      s.value ? s.value : c.value,
    );

    expect(() => c.value).toThrow("reads itself");

    s.value = 1;
    expect(c.value).toBe(1);
  });

  it("rethrows an error until a dependency changes", () => {
    const s = signal(0);
    const spy = createSpy(() => {
      if (s.value === 0) throw new Error("zero");
      return 1 / s.value;
    });
    const c = computed(spy);

    expect(() => c.value).toThrow("zero");
    expect(() => c.value).toThrow("zero");
    expect(spy.count).toBe(1);

    s.value = 2;
    expect(c.value).toBe(0.5);
  });

  it("stays correct once nothing is listening to it", async () => {
    const s = signal(1);
    const a = computed(() => s.value + 1);
    const b = computed(() => a.value + 1);
    const spy = createSpy(() => void b.value);
    const dispose = effect(spy);

    await flushed();
    dispose();

    s.value = 10;
    await flushed();

    expect(spy.count).toBe(1);
    expect(b.value).toBe(12);
  });
});

describe("effect", () => {
  it("first runs in a microtask", async () => {
    const spy = createSpy();
    effect(spy);

    expect(spy.count).toBe(0);
    await flushed();
    expect(spy.count).toBe(1);
  });

  it("runs again when a dependency changes", async () => {
    const s = signal(1);
    const seen: number[] = [];
    effect(() => void seen.push(s.value));

    await flushed();
    s.value = 2;
    await flushed();

    expect(seen).toEqual([1, 2]);
  });

  it("runs once for any number of writes", async () => {
    const a = signal(1);
    const b = signal(1);
    const seen: number[] = [];
    effect(() => void seen.push(a.value + b.value));
    await flushed();

    a.value = 2;
    a.value = 3;
    b.value = 4;
    await flushed();

    expect(seen).toEqual([2, 7]);
  });

  it("sees the latest value, if a value is written back before it runs", async () => {
    const s = signal(1);
    const seen: number[] = [];
    effect(() => void seen.push(s.value));
    await flushed();

    s.value = 2;
    s.value = 1;
    await flushed();

    expect(seen.at(-1)).toBe(1);
  });

  it("does not evaluate computeds that are no longer needed", async () => {
    const report = vi.spyOn(globalThis, "reportError").mockReturnValue();
    const index = signal(0);
    const items = signal(["a", "b"]);
    // only valid whilst the index is in bounds
    const item = computed(() => items.value[index.value]!.toUpperCase());
    const seen: string[] = [];

    effect(() => {
      seen.push(index.value < items.value.length ? item.value : "none");
    });
    await flushed();

    // had `item` been checked before `index`, this would throw
    index.value = 5;
    await flushed();

    expect(seen).toEqual(["A", "none"]);
    expect(report).not.toHaveBeenCalled();
  });

  it("runs once for a diamond, and never sees an inconsistent state", async () => {
    const s = signal(1);
    const left = computed(() => s.value + 1);
    const right = computed(() => s.value * 10);
    const seen: string[] = [];
    effect(() => void seen.push(`${left.value}:${right.value}`));
    await flushed();

    s.value = 2;
    await flushed();

    expect(seen).toEqual(["2:10", "3:20"]);
  });

  it("only depends on what it read last time", async () => {
    const toggle = signal(true);
    const a = signal("a");
    const b = signal("b");
    const seen: string[] = [];
    effect(() => void seen.push(toggle.value ? a.value : b.value));
    await flushed();

    b.value = "b2";
    await flushed();
    expect(seen).toEqual(["a"]);

    toggle.value = false;
    await flushed();
    expect(seen).toEqual(["a", "b2"]);

    a.value = "a2";
    await flushed();
    expect(seen).toEqual(["a", "b2"]);
  });

  it("does not depend on untracked reads", async () => {
    const a = signal(1);
    const b = signal(1);
    const spy = createSpy(() => void (a.value + untracked(() => b.value)));
    effect(spy);
    await flushed();

    b.value = 2;
    await flushed();
    expect(spy.count).toBe(1);

    a.value = 2;
    await flushed();
    expect(spy.count).toBe(2);
  });

  it("runs effects that were queued by other effects in the same microtask", async () => {
    const a = signal(1);
    const b = signal(1);
    const c = signal(1);
    const seen: number[] = [];

    effect(() => void seen.push(c.value));
    effect(() => void (c.value = b.value * 2));
    effect(() => void (b.value = a.value * 2));
    await flushed();
    expect(seen.at(-1)).toBe(4);

    a.value = 5;
    await flushed();
    expect(seen.at(-1)).toBe(20);
  });

  it("can write to its own dependency, so long as it settles", async () => {
    const s = signal(0);
    const spy = createSpy(() => {
      if (s.value < 5) s.value++;
    });
    effect(spy);
    await flushed();

    expect(s.value).toBe(5);
    expect(spy.count).toBe(6);
  });

  it("gives up on an effect which never settles", async () => {
    const report = vi.spyOn(globalThis, "reportError").mockReturnValue();
    const s = signal(0);
    const other = signal(0);
    const seen: number[] = [];

    effect(() => void s.value++);
    effect(() => void seen.push(other.value));
    await flushed();

    expect(report).toHaveBeenCalledTimes(1);
    expect(String(report.mock.lastCall![0])).toContain("loop");

    // everything else carries on as normal
    other.value = 1;
    await flushed();
    expect(seen).toEqual([0, 1]);
  });

  it("gives up on effects which endlessly trigger each other", async () => {
    const report = vi.spyOn(globalThis, "reportError").mockReturnValue();
    const a = signal(0);
    const b = signal(0);

    effect(() => void (b.value = a.value + 1));
    effect(() => void (a.value = b.value + 1));
    await flushed();

    expect(report).toHaveBeenCalled();
  });

  it("allows an effect which gave up to run again later", async () => {
    vi.spyOn(globalThis, "reportError").mockReturnValue();
    const s = signal(0);
    const limit = signal(Infinity);
    const spy = createSpy(() => {
      if (s.value < limit.value) s.value++;
    });

    effect(spy);
    await flushed();
    const before = spy.count;

    limit.value = 0;
    await flushed();
    expect(spy.count).toBe(before + 1);
  });

  it("stops when disposed", async () => {
    const s = signal(1);
    const spy = createSpy(() => void s.value);
    const dispose = effect(spy);
    await flushed();

    dispose();
    s.value = 2;
    await flushed();

    expect(spy.count).toBe(1);
  });

  it("never runs if disposed before its first run", async () => {
    const spy = createSpy();
    const dispose = effect(spy);

    dispose();
    await flushed();

    expect(spy.count).toBe(0);
  });

  it("does not run if disposed while queued", async () => {
    const s = signal(1);
    const spy = createSpy(() => void s.value);
    const dispose = effect(spy);
    await flushed();

    s.value = 2;
    dispose();
    await flushed();

    expect(spy.count).toBe(1);
  });

  it("can be disposed by another effect in the same pass", async () => {
    const s = signal(1);
    const spy = createSpy(() => void s.value);
    let dispose = () => {};

    effect(() => {
      if (s.value > 1) dispose();
    });
    dispose = effect(spy);
    await flushed();

    s.value = 2;
    await flushed();

    expect(spy.count).toBe(1);
  });

  it("can dispose of itself", async () => {
    const s = signal(1);
    const other = signal(1);
    const spy = createSpy(() => {
      if (s.value > 1) dispose();
      other.value;
    });
    const dispose = effect(spy);
    await flushed();

    s.value = 2;
    await flushed();
    expect(spy.count).toBe(2);

    // including anything it read after disposing
    other.value = 2;
    s.value = 3;
    await flushed();
    expect(spy.count).toBe(2);
  });

  it("reports an error, without stopping other effects", async () => {
    const report = vi.spyOn(globalThis, "reportError").mockReturnValue();
    const s = signal(1);
    const error = new Error("broken");
    const seen: number[] = [];

    effect(() => {
      if (s.value > 1) throw error;
    });
    effect(() => void seen.push(s.value));
    await flushed();

    s.value = 2;
    await flushed();

    expect(report).toHaveBeenCalledWith(error);
    expect(seen).toEqual([1, 2]);

    // and neither are any later changes affected
    s.value = 3;
    await flushed();
    expect(seen).toEqual([1, 2, 3]);
  });

  it("runs again after throwing, once a dependency changes", async () => {
    const report = vi.spyOn(globalThis, "reportError").mockReturnValue();
    const s = signal(0);
    const seen: number[] = [];

    effect(() => {
      if (s.value === 0) throw new Error("zero");
      seen.push(s.value);
    });
    await flushed();
    expect(report).toHaveBeenCalledTimes(1);

    s.value = 1;
    await flushed();
    expect(seen).toEqual([1]);
  });

  it("is notified of changes behind a computed that threw", async () => {
    const report = vi.spyOn(globalThis, "reportError").mockReturnValue();
    const s = signal(0);
    const c = computed(() => {
      if (s.value === 0) throw new Error("zero");
      return 1 / s.value;
    });
    const seen: number[] = [];

    effect(() => void seen.push(c.value));
    await flushed();
    expect(report).toHaveBeenCalledTimes(1);
    expect(seen).toEqual([]);

    s.value = 2;
    await flushed();
    expect(seen).toEqual([0.5]);
  });
});

// a subscription cannot be observed directly, but what it keeps alive can.
// this relies on the browser being launched with `--expose-gc`.
describe.skipIf(!("gc" in globalThis))("clean up", () => {
  async function isCollected(ref: WeakRef<object>) {
    // note: reading a WeakRef keeps its target alive until the current task is
    // over, so we must not look at it until we are done collecting.
    for (let i = 0; i < 5; i++) {
      (globalThis as any).gc();
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    return !ref.deref();
  }

  // creates a computed, hands it over to be used, then lets go of it.
  // if it is still alive after that, then `source` must be holding on to it.
  async function use(
    source: ReadonlySignal<number>,
    fn: (c: ReadonlySignal<number>) => void | Promise<void>,
  ) {
    const token = {};
    await fn(computed(() => (token ? source.value + 1 : 0)));
    return new WeakRef(token);
  }

  it("lets go of a computed once its last effect is disposed", async () => {
    const s = signal(1);
    const ref = await use(s, async (c) => {
      const chained = computed(() => c.value + 1);
      const dispose = effect(() => void chained.value);
      await flushed();
      dispose();
    });

    expect(await isCollected(ref)).toBe(true);
  });

  it("lets go of a computed when an effect disposes of itself", async () => {
    const s = signal(1);
    const ref = await use(s, async (c) => {
      const dispose = effect(() => {
        dispose();
        c.value;
      });
      await flushed();
    });

    expect(await isCollected(ref)).toBe(true);
  });

  it("holds on to a computed that is still in use", async () => {
    const s = signal(1);
    const seen: number[] = [];
    const ref = await use(s, async (c) => {
      const dispose = effect(() => void c.value);
      effect(() => void seen.push(c.value));
      await flushed();
      dispose();
    });

    expect(await isCollected(ref)).toBe(false);

    s.value = 2;
    await flushed();
    expect(seen).toEqual([2, 3]);
  });
});

describe("randomised", () => {
  // a tiny seeded generator, so that any failure can be reproduced
  function random(seed: number) {
    return () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 2 ** 32;
    };
  }

  type Node = { read(): number; model(values: number[]): number };

  it("agrees with a naive model for arbitrary graphs", async () => {
    for (let seed = 1; seed <= 150; seed++) {
      const next = random(seed);
      const int = (max: number) => Math.floor(next() * max);

      // sources, then layers of computeds which each read up to three earlier
      // nodes. which of the last two is read depends on the value of the first.
      const sources = Array.from({ length: 4 }, () => signal(int(4)));
      const nodes: Node[] = sources.map((source, i) => ({
        read: () => source.value,
        model: (values) => values[i]!,
      }));

      for (let i = 0; i < 12; i++) {
        const [a, b, c] = [0, 0, 0].map(() => nodes[int(nodes.length)]!);
        const k = int(5);
        const fn = (x: number, y: () => number, z: () => number) =>
          (x % 2 ? y() : z()) + k;
        const node = computed(() => fn(a!.read(), b!.read, c!.read));

        nodes.push({
          read: () => node.value,
          model: (v) =>
            fn(
              a!.model(v),
              () => b!.model(v),
              () => c!.model(v),
            ),
        });
      }

      const effects = Array.from({ length: 6 }, () => {
        const reads = [0, 0].map(() => nodes[int(nodes.length)]!);
        const state = { reads, runs: 0, seen: [] as number[], alive: true };
        const dispose = effect(() => {
          state.runs++;
          state.seen = reads.map((node) => node.read());
        });
        return { ...state, state, dispose };
      });

      await flushed();

      for (let step = 0; step < 12; step++) {
        const before = effects.map((e) => e.state.runs);

        // sometimes an effect is disposed of along the way
        if (int(6) === 0) {
          const e = effects[int(effects.length)]!;
          e.dispose();
          e.state.alive = false;
        }

        for (let writes = int(4); writes >= 0; writes--) {
          sources[int(sources.length)]!.value = int(4);
        }

        await flushed();

        const values = sources.map((source) => untracked(() => source.value));
        const where = `seed ${seed}, step ${step}`;

        effects.forEach((e, i) => {
          const runs = e.state.runs - before[i]!;

          if (e.state.alive) {
            // at most once per flush, and always up to date
            expect(runs, where).toBeLessThanOrEqual(1);
            expect(e.state.seen, where).toEqual(
              e.reads.map((node) => node.model(values)),
            );
          } else {
            expect(runs, where).toBe(0);
          }
        });

        nodes.forEach((node) => {
          expect(untracked(node.read), where).toBe(node.model(values));
        });
      }
    }
  });
});
