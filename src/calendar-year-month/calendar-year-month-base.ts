import { reset, vh } from "../utils/styles.js";

export const SELECT_STYLES = `${reset}${vh}`;

export const SELECT_TEMPLATE = `
  <label part="label" for="s">
    <slot name="label"></slot>
  </label>
  <select id="s" part="select"></select>
`;
