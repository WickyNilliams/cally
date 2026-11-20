// what the docs know of each component's API comes from the custom elements
// manifest, which is generated from the source. see cem-plugin.js
import manifest from "../../dist/custom-elements.json";

export interface ApiItem {
  name: string;
  description?: string;
  type?: { text: string };
  default?: string;
  attribute?: string;
  kind?: string;
  parameters?: ApiItem[];
  optional?: boolean;
  return?: { type?: { text: string } };
}

interface Element {
  tagName: string;
  members?: ApiItem[];
  events?: ApiItem[];
  slots?: ApiItem[];
  cssParts?: ApiItem[];
  cssProperties?: ApiItem[];
}

/** Each section of the API, in the order they are shown */
export const sections = {
  props: "Properties and attributes",
  events: "Events",
  methods: "Methods",
  cssprops: "CSS Custom Properties",
  parts: "CSS Parts",
  slots: "Slots",
} as const;

export type ApiKind = keyof typeof sections;

export function getElement(tag: string): Element {
  const element = (manifest.modules as { declarations: Element[] }[])
    .flatMap((m) => m.declarations)
    .find((d) => d.tagName === tag);

  if (!element) {
    throw new Error(`<${tag}> is not in the custom elements manifest`);
  }

  return element;
}

export function getItems(tag: string, kind: ApiKind): ApiItem[] {
  const element = getElement(tag);
  const members = element.members ?? [];

  switch (kind) {
    case "props":
      return members.filter((m) => m.kind === "field");
    case "methods":
      return members.filter((m) => m.kind === "method");
    case "events":
      return element.events ?? [];
    case "cssprops":
      return element.cssProperties ?? [];
    case "parts":
      return element.cssParts ?? [];
    case "slots":
      return element.slots ?? [];
  }
}
