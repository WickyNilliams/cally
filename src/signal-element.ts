import {
  signal,
  effect,
  batch,
  type Signal,
} from "dom-cue";

type ReadonlySignal<T> = Readonly<Signal<T>>;

export { signal, effect, batch };
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
      signals[key] = signal(config.value ?? (config.type === String ? "" : config.type === Number ? 0 : config.type === Boolean ? false : undefined));

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
    return Object.keys(props).filter(k => props[k].type !== Function).map(toKebab);
  }

  attributeChangedCallback(name: string, _old: string | null, next: string | null) {
    const key = toCamel(name);
    const ctor = this.constructor as typeof SignalElement;
    (this.$ as Record<string, Signal<unknown>>)[key].value = coerce(next ?? "", ctor.properties[key].type);
  }

  connectedCallback() {
    this.#cleanupEffects();
    this.setup()?.();
  }

  disconnectedCallback() {
    this.#cleanupEffects();
  }

  #cleanupEffects() {
    this.#cleanups.forEach(c => c());
    this.#cleanups = [];
  }

  /** Register a reactive effect that runs immediately and re-runs on signal changes */
  createEffect(fn: () => void): void {
    this.#cleanups.push(effect(fn));
  }

  /**
   * Override in subclass to set up DOM event listeners and reactive effects.
   * Return a function that will be called immediately after setup to register effects.
   */
  setup(): (() => void) | undefined {}
}


export function fire(el: Element, name: string, detail: unknown): void {
  el.dispatchEvent(new CustomEvent(name, { bubbles: true, detail }));
}

function coerce(value: unknown, type: PropertyConfig["type"]): unknown {
  if (type === Boolean) return value === true || value === "true" || value === "";
  if (type === Number) return +value! || 0;
  if (type === Function) return value;
  return ""+( value ?? "");
}

function toKebab(camel: string): string {
  return camel.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());
}

function toCamel(kebab: string): string {
  return kebab.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

