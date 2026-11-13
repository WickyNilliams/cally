import type { Base } from "./utils/base.js";

/**
 * The props of a component, given its class.
 *
 * @example
 * PropsOf<CalendarDate> // { value?: string; months?: number; ... }
 */
export type PropsOf<Element> =
  Element extends Base<infer Props, any, any> ? Partial<Props> : never;

/**
 * The events a component dispatches, given its class.
 * Each is mapped to the type of its `detail`.
 *
 * @example
 * EventsOf<CalendarDate> // { change: undefined; focusday: Date; ... }
 */
export type EventsOf<Element> =
  Element extends Base<any, infer Events, any> ? Events : never;

/** An event, as received by a listener on the component which dispatched it */
type EventFor<Element, Detail> = CustomEvent<Detail> & {
  readonly target: Element;
  readonly currentTarget: Element;
};

// frameworks have differing conventions for the name of a listener,
// so each needs the name of an event to be transformed in its own way.
interface Naming<Name extends string> {
  lowercase: `on${Name}`;
  capitalized: `on${Capitalize<Name>}`;
}

type Listeners<Element, Convention extends keyof Naming<string>> = {
  [Name in keyof EventsOf<Element> & string as Naming<Name>[Convention]]?: (
    event: EventFor<Element, EventsOf<Element>[Name]>,
  ) => void;
};

/**
 * The props and event listeners of a component, as written in React.
 * Listeners are named for their event verbatim e.g. `onpagechange`.
 */
export type ReactProps<Element> = PropsOf<Element> &
  Listeners<Element, "lowercase">;

/**
 * The props and event listeners of a component, as written in Svelte.
 * Listeners are named for their event verbatim e.g. `onpagechange`.
 */
export type SvelteProps<Element> = PropsOf<Element> &
  Listeners<Element, "lowercase">;

/**
 * The props and event listeners of a component, as written in Vue.
 * Listeners have the first letter of their event capitalized e.g. `onPagechange`.
 */
export type VueProps<Element> = PropsOf<Element> &
  Listeners<Element, "capitalized">;
