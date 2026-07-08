import { Signal, effect } from "./signals.js";
import type { BaseElement } from "./element.js";

/**
 * Minimal context implementation, loosely based on the community context
 * protocol. A consumer dispatches a composed, bubbling event; the nearest
 * ancestor provider for that context stops propagation and subscribes the
 * consumer to its value. Works across shadow boundaries and any number of
 * intermediate ancestors.
 */

const CONTEXT_EVENT = "cally::context";

export interface Context<T> {
  initial_: T;
}

interface ContextRequest<T> {
  context_: Context<T>;
  subscribe_: (get: () => T) => void;
}

export function createContext<T>(initial: T): Context<T> {
  return { initial_: initial };
}

/**
 * Make `host` answer context requests for `context` bubbling through it,
 * pushing the result of `get()` to consumers whenever a signal it reads
 * changes. Listens for the lifetime of the element.
 */
export function provideContext<T>(
  host: HTMLElement,
  context: Context<T>,
  get: () => T,
) {
  host.addEventListener(CONTEXT_EVENT, (e) => {
    const request = (e as CustomEvent<ContextRequest<T>>).detail;
    if (request.context_ !== context) return;
    e.stopPropagation();
    request.subscribe_(get);
  });
}

/**
 * Consume a context provided by any ancestor (in light or shadow DOM).
 * Returns a getter that reads the latest value reactively. Requests the
 * context on each connect, unsubscribes from the provider on disconnect.
 */
export function consumeContext<T>(
  host: BaseElement,
  context: Context<T>,
): () => T {
  const value = new Signal(context.initial_);

  host.onConnect_(() => {
    let dispose: (() => void) | undefined;

    host.dispatchEvent(
      new CustomEvent<ContextRequest<T>>(CONTEXT_EVENT, {
        bubbles: true,
        composed: true,
        detail: {
          context_: context,
          subscribe_(get) {
            dispose = effect(() => value.set(get()));
          },
        },
      }),
    );

    return () => dispose?.();
  });

  return () => value.get();
}
