/** @jsxImportSource ../core/jsx-html */

// this module is a pure string computation: it is evaluated at build time
// and replaced by its exported string literals (see precompile-templates.mjs)

/**
 * shared by both selects; `$label` is a marker the components substitute
 * with their accessible label, so the template isn't duplicated per label
 */
export const selectHtml: string = (
  <>
    <label part="label" for="s">
      <slot name="label">{"$label"}</slot>
    </label>
    <select id="s" part="select"></select>
  </>
);
