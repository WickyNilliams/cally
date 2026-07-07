import { Signal, tick, untracked } from "./signals.js";

export type PropType =
  | StringConstructor
  | NumberConstructor
  | BooleanConstructor
  | FunctionConstructor;

export interface PropDef {
  type: PropType;
  default?: unknown;
}

export type PropsDef = Record<string, PropDef>;

const kebabCase = (name: string) =>
  name.replace(/([A-Z])/g, "-$1").toLowerCase();

const TRUE_VALUES = new Set(["", "true", "1"]);

const parseAttribute = (type: PropType, value: string | null) => {
  if (type === Boolean) return value !== null && TRUE_VALUES.has(value);
  if (value === null) return null;
  return type === Number ? Number(value) : value;
};

type ConnectCallback = () => void | (() => void);

export class BaseElement extends HTMLElement {
  static props: PropsDef = {};
  static styles: CSSStyleSheet[] = [];
  static template?: HTMLTemplateElement;
  /** tag name, set by define() */
  static tag: string;
  static observedAttributes: string[] = [];
  /** attribute name -> prop name, set by define() */
  static attrs: Record<string, string> = {};

  #props = new Map<string, Signal<unknown>>();
  #connectCallbacks: ConnectCallback[] = [];
  #cleanups: (() => void)[] = [];
  #connectToken: object | undefined;

  constructor() {
    super();
    const ctor = this.constructor as typeof BaseElement;

    for (const [name, def] of Object.entries(ctor.props)) {
      this.#props.set(name, new Signal(def.default));
    }

    const root = this.attachShadow({ mode: "open" });
    root.adoptedStyleSheets = ctor.styles;
    if (ctor.template) {
      root.append(ctor.template.content.cloneNode(true));
    }
  }

  /** read a prop's current value, subscribing the active effect */
  getProp<T>(name: string): T {
    return this.#props.get(name)!.get() as T;
  }

  setProp(name: string, value: unknown) {
    const ctor = this.constructor as typeof BaseElement;
    const def = ctor.props[name]!;

    // mirror atomico: null/undefined resets to the default (booleans reset
    // to false), and empty string is only meaningful for string props
    if (value == null) {
      value = def.type === Boolean ? false : def.default;
    } else if (def.type !== String && value === "") {
      value = def.default;
    }

    this.#props.get(name)!.set(value);
  }

  attributeChangedCallback(
    attr: string,
    old: string | null,
    value: string | null,
  ) {
    if (old === value) return;
    const ctor = this.constructor as typeof BaseElement;
    const prop = ctor.attrs[attr];
    if (prop) {
      this.setProp(prop, parseAttribute(ctor.props[prop]!.type, value));
    }
  }

  /**
   * Register a callback run on every connect. An optional returned function
   * is run on disconnect. Effects created here are cleaned up on disconnect
   * and re-created on re-connect.
   */
  onConnect(callback: ConnectCallback) {
    this.#connectCallbacks.push(callback);
  }

  connectedCallback() {
    // capture properties set before the element was upgraded
    const ctor = this.constructor as typeof BaseElement;
    for (const name of Object.keys(ctor.props)) {
      if (Object.prototype.hasOwnProperty.call(this, name)) {
        const value = (this as Record<string, any>)[name];
        delete (this as Record<string, any>)[name];
        (this as Record<string, any>)[name] = value;
      }
    }

    // deferred by a microtask so that, when pre-existing DOM is upgraded,
    // ancestors have finished wiring up their context providers before any
    // descendant requests a context. definitions are all registered in the
    // same task, so this still runs before first paint
    const token = (this.#connectToken = {});
    queueMicrotask(() => {
      if (this.#connectToken !== token || !this.isConnected) return;

      for (const callback of this.#connectCallbacks) {
        const cleanup = callback();
        if (cleanup) this.#cleanups.push(cleanup);
      }
    });
  }

  disconnectedCallback() {
    this.#connectToken = undefined;
    for (const cleanup of this.#cleanups) cleanup();
    this.#cleanups = [];
  }

  /** resolves once pending updates have rendered */
  get updated(): Promise<void> {
    return tick();
  }

  emit<T>(type: string, detail?: T, options?: EventInit): boolean {
    // untracked so listeners reading signals don't subscribe a running effect
    return untracked(() =>
      this.dispatchEvent(new CustomEvent(type, { detail, ...options })),
    );
  }
}

/**
 * Define accessors for the class's props and register the custom element.
 */
export function define(tag: string, ctor: typeof BaseElement) {
  const attrs: Record<string, string> = {};

  for (const [name, def] of Object.entries(ctor.props)) {
    if (def.type !== Function) {
      attrs[kebabCase(name)] = name;
    }

    Object.defineProperty(ctor.prototype, name, {
      configurable: true,
      get(this: BaseElement) {
        return this.getProp(name);
      },
      set(this: BaseElement, value: unknown) {
        this.setProp(name, value);
      },
    });
  }

  ctor.tag = tag;
  ctor.attrs = attrs;
  ctor.observedAttributes = Object.keys(attrs);
  customElements.define(tag, ctor as unknown as CustomElementConstructor);
}

export function template(html: string): HTMLTemplateElement {
  const t = document.createElement("template");
  t.innerHTML = html;
  return t;
}

export function css(
  strings: TemplateStringsArray,
  ...values: unknown[]
): CSSStyleSheet {
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(String.raw(strings, ...values));
  return sheet;
}

/**
 * Set an attribute the way atomico rendered them: null/undefined removes
 * the attribute, any other value (including false) is stringified.
 */
export function setAttr(el: Element, name: string, value: unknown) {
  if (value == null) {
    el.removeAttribute(name);
  } else {
    el.setAttribute(name, `${value}`);
  }
}
