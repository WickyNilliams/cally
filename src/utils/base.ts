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

/** The arguments for dispatching an event, given the type of its detail */
type EmitArgs<Detail> = undefined extends Detail
  ? [detail?: Detail, bubbles?: boolean]
  : [detail: Detail, bubbles?: boolean];

type ListenerOptions = boolean | AddEventListenerOptions;

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

// classes whose props have accessors on their prototype
const finalized = new WeakSet<Function>();

// templates and stylesheets are created when first needed, rather than when
// the module is loaded, as that may happen on a server where there is no DOM
const cache: Record<string, any> = {};

/** Gets a `<template>` for a string of HTML */
function template(html: string): HTMLTemplateElement {
  if (!cache[html]) {
    cache[html] = document.createElement("template");
    cache[html].innerHTML = html;
  }
  return cache[html];
}

/** Gets a stylesheet for a string of CSS */
function stylesheet(css: string): CSSStyleSheet {
  if (!cache[css]) {
    cache[css] = new CSSStyleSheet();
    cache[css].replaceSync(css);
  }
  return cache[css];
}

const TRUTHY = /^(|true|1)$/;
const toAttr = (prop: string) => prop.replace(/[A-Z]/g, "-$&").toLowerCase();
const toProp = (attr: string) =>
  attr.replace(/-(.)/g, (_, char: string) => char.toUpperCase());

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

// makes listeners aware of the events a component dispatches. this is purely
// a matter of types, and is declared here so as to merge with the class below.
export interface Base<Props, Events, Internal> {
  addEventListener<K extends keyof Events>(
    type: K,
    listener: (this: this, event: CustomEvent<Events[K]>) => unknown,
    options?: ListenerOptions,
  ): void;
  addEventListener<K extends keyof HTMLElementEventMap>(
    type: K,
    listener: (this: this, event: HTMLElementEventMap[K]) => unknown,
    options?: ListenerOptions,
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: ListenerOptions,
  ): void;

  removeEventListener<K extends keyof Events>(
    type: K,
    listener: (this: this, event: CustomEvent<Events[K]>) => unknown,
    options?: boolean | EventListenerOptions,
  ): void;
  removeEventListener<K extends keyof HTMLElementEventMap>(
    type: K,
    listener: (this: this, event: HTMLElementEventMap[K]) => unknown,
    options?: boolean | EventListenerOptions,
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions,
  ): void;
}

/**
 * Just enough base class to serve our needs:
 *
 * - props backed by signals, settable via attributes
 * - a shadow root stamped once from a static template
 * - effects/context that follow the connected lifecycle
 *
 * `Events` maps the name of each event it dispatches to the type of its detail.
 * `Internal` is the same, for events which are not meant for public use.
 */
export abstract class Base<
  Props = {},
  Events = {},
  Internal = {},
  // so that merely importing a component doesn't throw on a server
> extends (globalThis.HTMLElement ?? (class {} as typeof HTMLElement)) {
  static props: PropDefs<any> = {};
  /** The HTML of the shadow root */
  static template?: string;
  /** The CSS of the shadow root */
  static styles?: string;

  /**
   * The platform reads this once for each class, when it is defined, before
   * any instance can be created. So it is also where we create accessors for
   * the class's props, as Lit does.
   */
  static get observedAttributes() {
    if (!finalized.has(this)) {
      finalized.add(this);

      for (const name in this.props) {
        const initial = this.props[name]![1];

        Object.defineProperty(this.prototype, name, {
          get(this: Base<any, any, any>) {
            return this.$[name]!.value;
          },
          set(this: Base<any, any, any>, value) {
            this.$[name]!.value = value ?? initial;
          },
        });
      }
    }

    return Object.keys(this.props)
      .filter((name) => this.props[name]![0] != Function)
      .map(toAttr);
  }

  /** Registers the component as a custom element. Does nothing on a server */
  static define(tag: string) {
    globalThis.customElements?.define(
      tag,
      this as unknown as CustomElementConstructor,
    );
  }

  /** Exists only so that the type of the public events can be inferred */
  declare protected readonly _events?: Events;

  /** The signals backing each prop */
  protected $ = {} as PropSignals<Props>;
  protected root = this.attachShadow({ mode: "open" });

  #setup: Setup[] = [];
  #teardown: ReturnType<Setup>[] = [];

  constructor() {
    super();
    const {
      props,
      template: html,
      styles: css,
    } = this.constructor as typeof Base;
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

    if (css) this.root.adoptedStyleSheets = [stylesheet(css)];
    if (html) this.root.append(template(html).content.cloneNode(true));
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

  /** Dispatches one of the events this component has declared */
  protected emit<K extends keyof (Events & Internal) & string>(
    type: K,
    ...[detail, bubbles]: EmitArgs<(Events & Internal)[K]>
  ) {
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
