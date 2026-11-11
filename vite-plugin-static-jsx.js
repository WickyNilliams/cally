import ts from "typescript";

/**
 * Compiles JSX to strings of HTML, so templates can be authored with the
 * tooling available for JSX, yet nothing is needed to support it at runtime.
 *
 *   <td part="td">{button}</td>  ->  `<td part="td">${button}</td>`
 *
 * As the output is HTML, attributes are written as they are in HTML (`class`,
 * `for` etc.), and only lowercase tags are supported. There are no components.
 *
 * Files which opt into another runtime via `@jsxImportSource` are left alone.
 *
 * @returns {import("vite").Plugin}
 */
export default function staticJsx() {
  return {
    name: "static-jsx",
    enforce: "pre",
    transform(code, id) {
      const [file] = id.split("?");
      if (!file.endsWith(".tsx") || code.includes("@jsxImportSource")) return;

      const source = ts.createSourceFile(
        file,
        code,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
      );

      return { code: rewrite(source, source), map: null };
    },
  };
}

const VOID =
  /^(area|base|br|col|embed|hr|img|input|link|meta|source|track|wbr)$/;

const isJsx = (node) =>
  ts.isJsxElement(node) ||
  ts.isJsxSelfClosingElement(node) ||
  ts.isJsxFragment(node);

const newlines = (str) => str.split("\n").length - 1;

// escapes anything with meaning inside a template literal
const escape = (str) => str.replace(/[\\`]|\$\{/g, "\\$&");

/**
 * Returns the code for a node, with any JSX within it compiled.
 */
function rewrite(node, source) {
  let pos = node === source ? 0 : node.getStart(source);
  let code = "";

  const visit = (child) => {
    if (!isJsx(child)) return ts.forEachChild(child, visit);

    const template = compile(child, source);

    // line continuations stand in for the lines that were removed.
    // they have no effect on the string, but keep line numbers intact.
    const padding = "\\\n".repeat(
      Math.max(0, newlines(child.getText(source)) - newlines(template)),
    );

    code += source.text.slice(pos, child.getStart(source));
    code += "`" + template + padding + "`";
    pos = child.getEnd();
  };

  visit(node);

  return code + source.text.slice(pos, node.getEnd());
}

/**
 * Returns the contents of a template literal, for some JSX.
 */
function compile(node, source) {
  if (ts.isJsxText(node)) {
    return escape(collapse(node.getFullText(source)));
  }

  if (ts.isJsxExpression(node)) {
    // an empty expression is how comments are written
    return node.expression ? "${" + rewrite(node.expression, source) + "}" : "";
  }

  const children = () =>
    node.children.map((child) => compile(child, source)).join("");

  if (ts.isJsxFragment(node)) {
    return children();
  }

  const { tagName, attributes } = node.openingElement ?? node;
  const tag = tagName.getText(source);
  let html = `<${tag}`;

  if (!/^[a-z]/.test(tag)) {
    fail(`<${tag}> is not supported, only HTML elements are`, node, source);
  }

  for (const attr of attributes.properties) {
    if (!ts.isJsxAttribute(attr)) {
      fail("Spread attributes are not supported", attr, source);
    }

    const value = attr.initializer;
    html += ` ${attr.name.getText(source)}`;

    if (value) {
      html += ts.isJsxExpression(value)
        ? '="${' + rewrite(value.expression, source) + '}"'
        : // as written, minus the quotes. any entities are left for the HTML parser
          `="${escape(value.getText(source).slice(1, -1).replace(/"/g, "&quot;"))}"`;
    }
  }

  html += ">";

  if (VOID.test(tag)) {
    return html;
  }

  return html + (ts.isJsxElement(node) ? children() : "") + `</${tag}>`;
}

/**
 * Applies the whitespace rules of JSX to some text.
 * Whitespace containing a newline is formatting, so is removed.
 */
function collapse(text) {
  const lines = text.split(/\r\n|\n|\r/);

  return lines
    .map((line, i) => {
      if (i > 0) line = line.trimStart();
      if (i < lines.length - 1) line = line.trimEnd();
      return line;
    })
    .filter(Boolean)
    .join(" ");
}

function fail(message, node, source) {
  const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
  throw new Error(`${message} (${source.fileName}:${line + 1})`);
}
