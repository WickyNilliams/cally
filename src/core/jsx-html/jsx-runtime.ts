/**
 * A JSX runtime that renders to an HTML string, for authoring shadow DOM
 * templates as JSX (via a per-file `@jsxImportSource` pragma). Templates
 * are built once at module load and handed to `template()`; there is no
 * per-instance or per-render JSX cost.
 *
 * This is a trusted authoring tool, not a sanitizer: children are emitted
 * verbatim (nested elements are already-rendered HTML strings), so template
 * text must not contain markup characters.
 *
 * Not to be confused with src/test-utils/jsx-runtime.ts, which builds real
 * DOM for tests.
 */

type Child = string | number | boolean | null | undefined | Child[];
type Props = Record<string, unknown> & { children?: Child };

/** elements with no closing tag (only the ones we use) */
const VOID = new Set(["col"]);

function renderChildren(children: Child): string {
  if (children == null || typeof children === "boolean") return "";
  if (Array.isArray(children)) return children.map(renderChildren).join("");
  return `${children}`;
}

export function jsx(
  tag: string | ((props: Props) => string),
  props: Props,
): string {
  if (typeof tag === "function") {
    return tag(props);
  }

  let attrs = "";
  let children: Child;

  for (const [name, value] of Object.entries(props)) {
    if (name === "children") {
      children = value as Child;
    } else if (value != null && value !== false) {
      attrs += value === true ? ` ${name}` : ` ${name}="${value}"`;
    }
  }

  const open = `<${tag}${attrs}>`;
  return VOID.has(tag) ? open : `${open}${renderChildren(children)}</${tag}>`;
}

export const jsxs = jsx;

export function Fragment(props: { children?: Child }): string {
  return renderChildren(props.children);
}

/** render `count` copies of a piece of template, joined together */
export function repeat(count: number, render: (i: number) => string): string {
  return Array.from({ length: count }, (_, i) => render(i)).join("");
}

export declare namespace JSX {
  type Element = string;
  interface IntrinsicElements {
    // attribute values are strings/numbers/booleans; the index signature
    // must also admit the children (arrays of rendered strings)
    [tag: string]: { [name: string]: Child };
  }
  interface ElementChildrenAttribute {
    children: {};
  }
}
