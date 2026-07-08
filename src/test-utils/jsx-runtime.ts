/**
 * A minimal JSX runtime used ONLY by tests (via tsconfig's jsxImportSource).
 * It creates real DOM elements directly - there is no vdom. It is never
 * included in the published bundle.
 */

type FunctionComponent = (props: Record<string, unknown>) => Node;
type ElementConstructor = { new (): HTMLElement; tag_: string };
type JsxType = string | FunctionComponent | ElementConstructor;

function append(parent: Node, child: unknown) {
  if (child == null || typeof child === "boolean") return;
  if (Array.isArray(child)) {
    for (const c of child) append(parent, c);
  } else {
    parent.appendChild(
      child instanceof Node ? child : document.createTextNode(`${child}`),
    );
  }
}

export function jsx(type: JsxType, props: Record<string, any> = {}): Node {
  const { children, ...rest } = props ?? {};

  if (typeof type === "function" && !(type.prototype instanceof HTMLElement)) {
    return (type as FunctionComponent)(props);
  }

  const el = document.createElement(
    typeof type === "string" ? type : (type as ElementConstructor).tag_,
  );

  for (const [key, value] of Object.entries(rest)) {
    if (value == null) {
      continue;
    } else if (key.startsWith("on") && typeof value === "function") {
      el.addEventListener(key.slice(2), value as EventListener);
    } else if (key in el) {
      (el as unknown as Record<string, unknown>)[key] = value;
    } else if (value != null && value !== false) {
      el.setAttribute(key, value === true ? "" : `${value}`);
    }
  }

  append(el, children);
  return el;
}

export const jsxs = jsx;

export function Fragment(props: { children?: unknown }): Node {
  const fragment = document.createDocumentFragment();
  append(fragment, props.children);
  return fragment;
}

export declare namespace JSX {
  // tests assert runtime behaviour; JSX type checking is intentionally loose
  type Element = any;
  interface ElementClass {}
  type LibraryManagedAttributes<C, P> = Record<string, any>;
  interface IntrinsicElements {
    [tag: string]: any;
  }
  interface ElementChildrenAttribute {
    children: {};
  }
}
