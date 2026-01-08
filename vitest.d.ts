import "vitest";

interface CustomMatchers<R = unknown> {
  toHavePart(expectedPart: string): R;
  toBeActiveElement(root?: Document | ShadowRoot): R;
}

declare module "vitest" {
  interface Matchers<T = any> extends CustomMatchers<T> {}
}
