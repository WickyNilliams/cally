import { jsx, Fragment } from "./jsx-runtime.js";
export { Fragment };
export type { JSX } from "./jsx-runtime.js";

export const jsxDEV = (type: any, props: any) => jsx(type, props);
