import { jsx, Fragment } from "./jsx-runtime.js";
export { Fragment };
export type { JSX } from "./jsx-runtime.js";

export const jsxDEV = (tag: string, props: Record<string, unknown>) =>
  jsx(tag, props);
