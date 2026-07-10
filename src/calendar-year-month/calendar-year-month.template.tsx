/** @jsxImportSource ../core/jsx-html */

export const selectHtml = (label: string): string => (
  <>
    <label part="label" for="s">
      <slot name="label">{label}</slot>
    </label>
    <select id="s" part="select"></select>
  </>
);
