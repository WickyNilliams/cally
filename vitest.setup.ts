import { expect } from "vitest";

/**
 * Get the currently focused element, traversing shadow DOM boundaries.
 */
function getActiveElement(root: Document | ShadowRoot = document) {
  if (
    root.activeElement &&
    "shadowRoot" in root.activeElement &&
    root.activeElement.shadowRoot
  ) {
    return getActiveElement(root.activeElement.shadowRoot);
  }

  return root.activeElement;
}

/**
 * Custom Vitest matchers for calendar component testing.
 */
expect.extend({
  /**
   * Custom matcher for CSS Parts API (Shadow Parts).
   * Checks if an element's part attribute contains the specified value.
   */
  toHavePart(element: Element, expectedPart: string) {
    const { isNot } = this;
    const hasPart = element.part?.contains(expectedPart) ?? false;

    return {
      pass: hasPart,
      message: () => {
        const parts = element.part
          ? Array.from(element.part).join(", ")
          : "none";
        if (isNot) {
          return `Expected element not to have part "${expectedPart}", but it does.\nElement parts: ${parts}`;
        }
        return `Expected element to have part "${expectedPart}", but it doesn't.\nElement parts: ${parts}`;
      },
    };
  },

  /**
   * Custom matcher for checking active element with Shadow DOM support.
   *
   * Note: Vitest's built-in toHaveFocus() doesn't work properly with Shadow DOM -
   * it times out even with retry logic because it can't traverse shadow boundaries
   * to find the actually focused element.
   *
   * This matcher uses getActiveElement() to recursively find the focused element
   * within shadow trees, while still providing Vitest's retry-ability through the
   * custom matcher infrastructure.
   */
  toBeActiveElement(element: Element, root?: Document | ShadowRoot) {
    const { isNot } = this;
    const activeElement = getActiveElement(root);
    const isFocused = activeElement === element;

    return {
      pass: isFocused,
      message: () => {
        if (isNot) {
          return `Expected element not to be the active element, but it is.`;
        }
        return `Expected element to be the active element, but it isn't.\nActive element: ${activeElement?.tagName || "null"}`;
      },
    };
  },
});
