import { build } from "esbuild";

/**
 * Vite plugin that evaluates `*.template.tsx` modules at build time and
 * replaces them with their exported string literals. Template modules are
 * pure string computations (JSX via the src/core/jsx-html runtime), so the
 * shipped bundle contains only the finished HTML strings - no JSX runtime,
 * no string building. Dev and tests skip this and run the modules as-is,
 * which produces identical strings.
 */
export function precompileTemplates() {
  return {
    name: "precompile-templates",
    apply: "build",
    enforce: "pre",
    async transform(_code, id) {
      if (!id.endsWith(".template.tsx")) return;

      const bundled = await build({
        entryPoints: [id],
        bundle: true,
        write: false,
        format: "esm",
        platform: "neutral",
      });

      const js = Buffer.from(bundled.outputFiles[0].text).toString("base64");
      const mod = await import(`data:text/javascript;base64,${js}`);

      // single-quoted literals: the html strings are full of double quotes,
      // and JSON.stringify's escapes for those survive minification
      const literal = (value) =>
        `'${value.replace(/[\\']/g, (c) => `\\${c}`).replace(/\n/g, "\\n")}'`;

      const code = Object.entries(mod)
        .map(([name, value]) => {
          if (typeof value !== "string") {
            throw new Error(`${id}: export "${name}" is not a string`);
          }
          return `export const ${name} = ${literal(value)};`;
        })
        .join("\n");

      return { code, map: null };
    },
  };
}
