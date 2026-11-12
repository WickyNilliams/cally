import {
  effect,
  signal,
  untracked,
  type ReadonlySignal,
  type Signal,
} from "./signals.js";

type PropType =
  | StringConstructor
  | NumberConstructor
  | BooleanConstructor
  | FunctionConstructor;

/** maps each prop to its type (for attribute conversion) and initial value */
export type PropDefs<Props> = {
  [K in keyof Props]-?: [type: PropType, initial?: Props[K]];
};

type PropSignals<Props> = { [K in keyof Props]-?: Signal<Props[K]> };

type Setup = () => void | (() => void);

/**
 * The props of a component, as exported for use in react/vue/etc
 */
export type ComponentProps<T> = { [K in keyof Partial<T>]: Partial<T>[K] } & {};

export interface Context<T> {
  /** doubles as the name of the event used to request the context */
  name: string;
  /** the value consumers see when there is no provider */
  initial: T;
}

// incremented whenever a provider is connected, which has consumers look for
// their provider again. a provider can turn up after its consumers (e.g. the
// order in which elements are defined), or end up nearer than the one found before.
const providers = signal(0);

const TRUTHY = /^(|true|1)$/;
const toAttr = (prop: string) => prop.replace(/[A-Z]/g, "-$&").toLowerCase();
const toProp = (attr: string) =>
  attr.replace(/-(.)/g, (_, char: string) => char.toUpperCase());

/** Creates a `<template>` from a string of HTML */
export function template(html: string) {
  const el = document.createElement("template");
  el.innerHTML = html;
  return el;
}

export function css(...styles: string[]) {
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(styles.join(""));
  return sheet;
}

/** Sets (or removes, if nullish) an attribute, only touching the DOM on change */
export function setAttr(
  el: Element,
  name: string,
  value: string | number | boolean | null | undefined,
) {
  const next = value == null ? null : `${value}`;

  if (el.getAttribute(name) !== next) {
    next == null ? el.removeAttribute(name) : el.setAttribute(name, next);
  }
}

export function setText(node: Node, text: string | number) {
  if (node.textContent !== `${text}`) {
    node.textContent = `${text}`;
  }
}

/**
 * Just enough base class to serve our needs:
 *
 * - props backed by signals, settable via attributes
 * - a shadow root stamped once from a static template
 * - effects/context that follow the connected lifecycle
 */
export abstract class Base<Props = {}> extends HTMLElement {
  static props: PropDefs<any> = {};
  static template?: HTMLTemplateElement;
  static styles?: CSSStyleSheet;

  static get observedAttributes() {
    return Object.keys(this.props)
      .filter((name) => this.props[name]![0] != Function)
      .map(toAttr);
  }

  /** Creates accessors for all props, then registers the element */
  static define(tag: string) {
    for (const name in this.props) {
      const initial = this.props[name]![1];

      Object.defineProperty(this.prototype, name, {
        get(this: Base<any>) {
          return this.$[name]!.value;
        },
        set(this: Base<any>, value) {
          this.$[name]!.value = value ?? initial;
        },
      });
    }

    customElements.define(tag, this as unknown as CustomElementConstructor);
  }

  /** The signals backing each prop */
  protected $ = {} as PropSignals<Props>;
  protected root = this.attachShadow({ mode: "open" });

  #setup: Setup[] = [];
  #teardown: ReturnType<Setup>[] = [];

  constructor() {
    super();
    const { props, template, styles } = this.constructor as typeof Base;
    const self = this as any;

    for (const name in props) {
      self.$[name] = signal(props[name]![1]);

      // a prop may have been set before the element was upgraded
      if (Object.hasOwn(this, name)) {
        const value = self[name];
        delete self[name];
        self[name] = value;
      }
    }

    if (styles) this.root.adoptedStyleSheets = [styles];
    if (template) this.root.append(template.content.cloneNode(true));
  }

  connectedCallback() {
    this.#teardown = this.#setup.map((fn) => fn());
  }

  disconnectedCallback() {
    for (const fn of this.#teardown) fn?.();
  }

  attributeChangedCallback(attr: string, _: unknown, value: string | null) {
    const name = toProp(attr);
    const type = (this.constructor as typeof Base).props[name]![0];

    (this as any)[name] =
      value == null
        ? value
        : type == Boolean
          ? TRUTHY.test(value)
          : type == Number
            ? // null means we fallback to the initial value
              isNaN(+value)
              ? null
              : +value
            : value;
  }

  /** Registers an effect which lives for as long as the element is connected */
  protected effect(fn: () => void) {
    this.#setup.push(() => effect(fn));
  }

  protected emit(type: string, detail?: unknown, bubbles?: boolean) {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles }));
  }

  protected query<T extends Element>(selector: string) {
    return this.root.querySelector<T>(selector)!;
  }

  /** Makes `value` available to any descendant, including across shadow roots */
  protected provide<T>(context: Context<T>, value: T) {
    this.addEventListener(context.name, (e) => {
      e.stopPropagation();
      (e as CustomEvent<(value: T) => void>).detail(value);
    });

    this.#setup.push(() => {
      untracked(() => providers.value++);
    });
  }

  /** Gets the value of the nearest provider */
  protected consume<T>(context: Context<T>): ReadonlySignal<T> {
    const current = signal(context.initial);

    // this is not done upon connecting, but along with all other effects.
    // by then everything that was connected in the same task is in place.
    this.effect(() => {
      let found = context.initial;
      providers.value;

      this.dispatchEvent(
        new CustomEvent(context.name, {
          bubbles: true,
          composed: true,
          detail: (value: T) => (found = value),
        }),
      );

      current.value = found;
    });

    return current;
  }
}
