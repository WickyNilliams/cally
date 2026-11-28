/** Finds the button for a day, within any month */
export function day(label: string): HTMLButtonElement {
  for (const month of document.querySelectorAll("calendar-month")) {
    const button = month.shadowRoot?.querySelector<HTMLButtonElement>(
      `button[aria-label="${label}"]`,
    );
    if (button) return button;
  }

  throw new Error(`There is no day labelled "${label}"`);
}
