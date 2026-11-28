// checked by `svelte-check`, to make sure the types from the docs are applied
import type { SvelteHTMLElements } from "svelte/elements";

type Range = SvelteHTMLElements["calendar-range"];

// @ts-expect-error months is a number
export const wrongType: Range = { months: "two" };

// events, as svelte 5 and svelte 4 expect them
export const events: Range = { onchange: () => {}, "on:change": () => {} };
