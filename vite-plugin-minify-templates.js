/**
 * Removes insignificant whitespace from html`` templates.
 *
 * Any whitespace containing a newline is considered to be formatting. Around
 * tags and interpolations it is dropped entirely, and within a tag it is
 * collapsed to a single space.
 *
 * This runs in all modes, so that what is tested is what is shipped. Outside
 * of a build, newlines are swapped for line continuations rather than removed,
 * which keeps line numbers intact without the need for a source map.
 *
 * Note: this is intentionally naive. Templates must not contain a backtick.
 *
 * @returns {import("vite").Plugin}
 */
export default function minifyTemplates() {
  let isBuild = false;

  return {
    name: "minify-templates",
    configResolved(config) {
      isBuild = config.command === "build";
    },
    transform(code, id) {
      if (!/\.ts$/.test(id) || !code.includes("html`")) return;

      return {
        code: code.replace(/html`([^`]*)`/g, (_, template) => {
          const minified = template.replace(
            /\s*\n\s*/g,
            (space, offset, str) => {
              const before = str[offset - 1];
              const after = str[offset + space.length];
              const isBoundary =
                !before ||
                !after ||
                before === ">" ||
                before === "}" ||
                after === "<" ||
                after === "$";

              return (
                (isBoundary ? "" : " ") +
                (isBuild ? "" : "\\\n".repeat(space.split("\n").length - 1))
              );
            },
          );

          return `html\`${minified}\``;
        }),
        map: null,
      };
    },
  };
}
