/**
 * A minimal JSX runtime for tests, which creates real DOM nodes.
 * This allows fixtures to be declared with JSX, with no framework involved.
 */

type Child = Node | string | null | undefined | false | Child[];
type Props = Record<string, unknown> & { children?: Child };
type Component = (props: any) => Element;
type Constructor = new () => HTMLElement;

export namespace JSX {
  export type Element = globalThis.Element;
  export type ElementType = string | Constructor | Component;

  export interface ElementChildrenAttribute {
    children: {};
  }

  export interface IntrinsicElements {
    [tag: string]: Record<string, unknown>;
  }

  // props for custom elements are not checked
  export type LibraryManagedAttributes<C, P> = C extends Constructor
    ? Record<string, unknown>
    : P;
}

const isElement = (type: Constructor | Component): type is Constructor =>
  type.prototype instanceof HTMLElement;

export function jsx(
  type: string | Constructor | Component,
  { children, ...props }: Props,
): Element {
  if (typeof type === "function" && !isElement(type)) {
    return type({ children, ...props });
  }

  const el: any =
    typeof type === "string" ? document.createElement(type) : new type();

  for (const [key, value] of Object.entries(props)) {
    if (value === undefined) {
      continue;
    } else if (key.startsWith("on") && typeof value === "function") {
      el.addEventListener(key.slice(2), value);
    } else if (key in el) {
      el[key] = value;
    } else {
      el.setAttribute(key, value);
    }
  }

  el.append(
    ...[children]
      .flat(Infinity as 1)
      .filter((child) => child != null && child !== false),
  );

  return el;
}

export { jsx as jsxs, jsx as jsxDEV };
