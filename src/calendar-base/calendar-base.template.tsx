/** @jsxImportSource ../core/jsx-html */

// this module is a pure string computation: it is evaluated at build time
// and replaced by its exported string literals (see precompile-templates.mjs)

const button = (name: string, label: string) => (
  <button part={`button ${name}`}>
    <slot name={name}>{label}</slot>
  </button>
);

export const baseHtml: string = (
  <div role="group" aria-labelledby="h" part="container">
    <calendar-heading
      month="long"
      year="numeric"
      id="h"
      class="vh"
      aria-live="polite"
      aria-atomic="true"
    ></calendar-heading>
    <div part="header">
      {button("previous", "Previous")}
      <slot part="heading" name="heading">
        <calendar-heading year="numeric" aria-hidden="true"></calendar-heading>
      </slot>
      {button("next", "Next")}
    </div>
    <slot part="months"></slot>
  </div>
);
