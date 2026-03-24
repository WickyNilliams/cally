import {
  signal,
  computed,
  effect,
  batch,
  type Signal,
} from "dom-cue";

type ReadonlySignal<T> = Readonly<Signal<T>>;

export { signal, computed, effect, batch };
export type { Signal, ReadonlySignal };

type PropertyConfig = {
  type: typeof String | typeof Number | typeof Boolean | typeof Function;
  value?: unknown;
};

type PropertiesConfig = Record<string, PropertyConfig>;

type SignalProps<T extends PropertiesConfig> = {
  [K in keyof T]: Signal<
    T[K]["type"] extends typeof String
      ? string
      : T[K]["type"] extends typeof Number
        ? number
        : T[K]["type"] extends typeof Boolean
          ? boolean
          : T[K]["type"] extends typeof Function
            ? Function
            : unknown
  >;
};

export class SignalElement<
  T extends PropertiesConfig = PropertiesConfig,
> extends HTMLElement {
  static properties: PropertiesConfig = {};
  static styles: string = "";
  static template: string = "";

  /** Reactive signal proxies for each declared property */
  $!: SignalProps<T>;

  #cleanups: (() => void)[] = [];
  #connected = false;

  constructor() {
    super();
    const ctor = this.constructor as typeof SignalElement;

    // Create shadow root
    const shadow = this.attachShadow({ mode: "open" });

    // Apply styles
    if (ctor.styles) {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(ctor.styles);
      shadow.adoptedStyleSheets = [sheet];
    }

    // Stamp template
    if (ctor.template) {
      shadow.innerHTML = ctor.template;
    }

    // Create signals for each declared property
    const props = ctor.properties as T;
    const signals: Record<string, Signal<unknown>> = {};

    for (const [key, config] of Object.entries(props)) {
      // Function-typed props: value IS the default function, not a factory.
      // All other types: value can be a factory (() => default) or literal.
      const defaultValue =
        config.type === Function
          ? config.value
          : typeof config.value === "function"
            ? (config.value as () => unknown)()
            : config.value;
      signals[key] = signal(defaultValue ?? getTypeDefault(config.type));

      // Define property getter/setter on the element
      Object.defineProperty(this, key, {
        get() {
          return signals[key].value;
        },
        set(v: unknown) {
          signals[key].value = coerce(v, config.type);
        },
        enumerable: true,
        configurable: true,
      });
    }

    this.$ = signals as SignalProps<T>;
  }

  static get observedAttributes(): string[] {
    const props = (this as typeof SignalElement).properties;
    return Object.entries(props)
      .filter(([, c]) => c.type !== Function)
      .map(([k]) => toKebab(k));
  }

  attributeChangedCallback(name: string, _old: string | null, next: string | null) {
    const key = toCamel(name);
    const ctor = this.constructor as typeof SignalElement;
    const config = ctor.properties[key];
    if (!config) return;
    const sig = (this.$ as Record<string, Signal<unknown>>)[key];
    sig.value = coerce(next ?? "", config.type);
  }

  connectedCallback() {
    if (this.#connected) this.#cleanupEffects();
    this.#connected = true;
    const result = this.setup();
    if (typeof result === "function") result();
  }

  disconnectedCallback() {
    this.#cleanupEffects();
    this.#connected = false;
  }

  #cleanupEffects() {
    for (const cleanup of this.#cleanups) {
      cleanup();
    }
    this.#cleanups = [];
  }

  /** Register a reactive effect that runs immediately and re-runs on signal changes */
  createEffect(fn: () => void): void {
    const dispose = effect(fn);
    this.#cleanups.push(dispose);
  }

  /**
   * Override in subclass to set up DOM event listeners and reactive effects.
   * Return a function that will be called immediately after setup to register effects.
   */
  setup(): void | (() => void) {}
}

function getTypeDefault(type: PropertyConfig["type"]): unknown {
  if (type === String) return "";
  if (type === Number) return 0;
  if (type === Boolean) return false;
  if (type === Function) return undefined;
  return undefined;
}

function coerce(value: unknown, type: PropertyConfig["type"]): unknown {
  if (type === Boolean) {
    if (typeof value === "boolean") return value;
    return value === "true" || value === "";
  }
  if (type === Number) {
    const n = Number(value);
    return isNaN(n) ? 0 : n;
  }
  if (type === Function) return value;
  return value == null ? "" : String(value);
}

function toKebab(camel: string): string {
  return camel.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());
}

function toCamel(kebab: string): string {
  return kebab.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

// ── Context ──────────────────────────────────────────────────────────────────

export function createContext<T>(name: string) {
  const eventName = `__ctx:${name}`;

  return {
    provide(host: HTMLElement, value: T) {
      host.addEventListener(eventName, (e: Event) => {
        e.stopPropagation();
        (e as CustomEvent<{ value?: T }>).detail.value = value;
      });
    },

    consume(host: HTMLElement): T | undefined {
      const detail: { value?: T } = {};
      host.dispatchEvent(
        new CustomEvent(eventName, {
          bubbles: true,
          composed: true,
          detail,
        })
      );
      return detail.value;
    },
  };
}
