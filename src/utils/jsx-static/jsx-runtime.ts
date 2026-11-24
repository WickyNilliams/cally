/**
 * The types for JSX in templates.
 *
 * There is nothing here at runtime, since templates are compiled to strings
 * of HTML at build time. See `vite-plugin-static-jsx.js`.
 */
export namespace JSX {
  export type Element = string;

  export interface ElementChildrenAttribute {
    children: {};
  }

  export interface IntrinsicElements {
    [tag: string]: Record<string, unknown>;
  }
}
