import type { DOMEventTarget } from "atomico/types/dom";
import { reset, vh } from "../utils/styles";

export type MonthOption = {
  label: string;
  value: string;
  disabled: boolean;
  selected: boolean;
};
export type YearOption = {
  label: string;
  value: string;
  selected: boolean;
};

export type ChangeEvent = DOMEventTarget<
  Event,
  HTMLSelectElement,
  Element | Node
>;

export function SelectBase(props: {
  options: MonthOption[] | YearOption[];
  onChange: (e: ChangeEvent) => void;
  label: string;
}) {
  return (
    <>
      <label part="label" for="s">
        <slot name="label">{props.label}</slot>
      </label>
      <select id="s" part="select" onchange={props.onChange}>
        {props.options.map((option) => (
          <option part="option" {...option} />
        ))}
      </select>
    </>
  );
}

export const styles = [reset, vh];
