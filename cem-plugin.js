import ts from "typescript";
import fs from "fs";
import path from "path";

/**
 * Completes the custom elements manifest, using what the analyzer can't know
 * about how our components are written:
 *
 * - elements are registered via `Class.define("tag")`
 * - props and attributes are declared via `static props`, typed by an interface
 * - events are declared via the `Events` type argument of the base class
 *
 * Types, descriptions and defaults all come from the source, via the type
 * checker. Descriptions are the JSDoc of the props/events interfaces. A class
 * can override one with `@property name - description`.
 *
 * Slots, CSS parts and CSS custom properties are documented with JSDoc tags on
 * the class, which the analyzer reads. These are checked against the templates
 * and stylesheets, so that the manifest can't fall out of date.
 *
 * Only what defines an element ends up in the manifest. Base classes and
 * internals are left out, and each element is described in full.
 *
 * @returns {import("@custom-elements-manifest/analyzer").Plugin}
 */
export default function cally({ tsconfig = "tsconfig.json" } = {}) {
  const root = process.cwd();
  const src = path.join(root, "src") + path.sep;

  const config = ts.readConfigFile(tsconfig, ts.sys.readFile);
  const { fileNames, options } = ts.parseJsonConfigFileContent(
    config.config,
    ts.sys,
    root,
  );
  const program = ts.createProgram(fileNames, options);
  const checker = program.getTypeChecker();

  const isOurs = (symbol) =>
    symbol?.declarations?.some((d) =>
      d.getSourceFile().fileName.startsWith(src),
    );

  /**
   * Prints a type as written in the source, so unions keep their order.
   * Our own aliases and interfaces are expanded, as they aren't exported.
   */
  function printNode(node) {
    if (ts.isUnionTypeNode(node)) return node.types.map(printNode).join(" | ");

    if (ts.isFunctionTypeNode(node)) {
      const params = node.parameters.map(
        (p) =>
          `${p.name.getText()}${p.questionToken ? "?" : ""}: ${printNode(p.type)}`,
      );
      return `(${params.join(", ")}) => ${printNode(node.type)}`;
    }

    if (ts.isTypeReferenceNode(node)) {
      let symbol = checker.getSymbolAtLocation(node.typeName);
      if (symbol && symbol.flags & ts.SymbolFlags.Alias) {
        symbol = checker.getAliasedSymbol(symbol);
      }

      if (isOurs(symbol)) {
        const decl = symbol.declarations[0];
        return ts.isTypeAliasDeclaration(decl)
          ? printNode(decl.type)
          : print(checker.getTypeFromTypeNode(node));
      }
    }

    return node.getText();
  }

  /** The type of a declaration, as written if possible */
  const typeOf = (decl, type) =>
    decl?.type ? printNode(decl.type) : print(type);

  /** Prints a type, expanding our own aliases and interfaces into what they hold */
  function print(type) {
    if (type.aliasSymbol && isOurs(type.aliasSymbol) && type.isUnion()) {
      return type.types.map(print).join(" | ");
    }

    const symbol = type.getSymbol();
    if (
      isOurs(symbol) &&
      symbol.flags & ts.SymbolFlags.Interface &&
      !type.getCallSignatures().length
    ) {
      const members = checker.getPropertiesOfType(type).map((p) => {
        const optional = p.flags & ts.SymbolFlags.Optional ? "?" : "";
        const type = checker.getTypeOfSymbol(p);
        return `${p.name}${optional}: ${print(optional ? checker.getNonNullableType(type) : type)}`;
      });
      return `{ ${members.join("; ")} }`;
    }

    return checker.typeToString(
      type,
      undefined,
      ts.TypeFormatFlags.NoTruncation,
    );
  }

  const describe = (symbol) =>
    ts.displayPartsToString(symbol.getDocumentationComment(checker)) ||
    undefined;

  /** The classes an element is built from, starting with its own */
  function chainOf(classDecl) {
    const chain = [];

    for (let decl = classDecl; decl; ) {
      chain.push(decl);
      const base = decl.heritageClauses?.find(
        (h) => h.token === ts.SyntaxKind.ExtendsKeyword,
      )?.types[0];

      let symbol = base && checker.getSymbolAtLocation(base.expression);
      if (symbol && symbol.flags & ts.SymbolFlags.Alias) {
        symbol = checker.getAliasedSymbol(symbol);
      }

      decl = isOurs(symbol) ? symbol.valueDeclaration : undefined;
    }

    return chain;
  }

  /** Finds the entry for a prop in a `static props` object, following spreads */
  function findPropDef(objectLiteral, name) {
    for (const el of objectLiteral.properties) {
      if (ts.isPropertyAssignment(el) && el.name.getText() === name) {
        return el.initializer;
      }
    }

    for (const el of objectLiteral.properties) {
      if (!ts.isSpreadAssignment(el)) continue;
      const decl = checker.getSymbolAtLocation(el.expression)?.valueDeclaration;
      const init = decl?.initializer;
      const found =
        init && ts.isObjectLiteralExpression(init) && findPropDef(init, name);
      if (found) return found;
    }
  }

  /** The slots and parts found in the templates of the given source files */
  function templateOf(sourceFiles) {
    const slots = new Set();
    const parts = new Set();

    const visit = (node) => {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const attrs = new Map(
          node.attributes.properties
            .filter(
              (a) =>
                ts.isJsxAttribute(a) &&
                a.initializer &&
                ts.isStringLiteral(a.initializer),
            )
            .map((a) => [a.name.getText(), a.initializer.text]),
        );

        if (node.tagName.getText() === "slot")
          slots.add(attrs.get("name") ?? "");
        attrs
          .get("part")
          ?.split(/\s+/)
          .forEach((part) => parts.add(part));
      }

      ts.forEachChild(node, visit);
    };

    sourceFiles.forEach(visit);
    return { slots, parts };
  }

  /** The custom properties declared in the stylesheets the given source files import */
  function cssPropertiesOf(sourceFiles) {
    const properties = new Map();

    for (const sf of sourceFiles) {
      for (const statement of sf.statements) {
        if (!ts.isImportDeclaration(statement)) continue;
        const specifier = statement.moduleSpecifier.text;
        if (!specifier.endsWith(".css?inline")) continue;

        const file = path.resolve(
          path.dirname(sf.fileName),
          specifier.replace("?inline", ""),
        );
        const css = fs.readFileSync(file, "utf8");

        for (const [, name, value] of css.matchAll(
          /(--[\w-]+)\s*:\s*([^;}]+)/g,
        )) {
          properties.set(name, value.trim());
        }
      }
    }

    return properties;
  }

  /** Every `Class.define("tag")` in a source file */
  function definitionsIn(sf) {
    return sf.statements.flatMap((statement) => {
      const call = ts.isExpressionStatement(statement) && statement.expression;
      if (
        call &&
        ts.isCallExpression(call) &&
        ts.isPropertyAccessExpression(call.expression) &&
        call.expression.name.text === "define" &&
        ts.isIdentifier(call.expression.expression) &&
        ts.isStringLiteral(call.arguments[0])
      ) {
        return [
          {
            className: call.expression.expression.text,
            tagName: call.arguments[0].text,
          },
        ];
      }
      return [];
    });
  }

  const strip = ({ inheritedFrom, ...item }) => item;
  const nonEmpty = (array) => (array?.length ? array : undefined);
  const toAttr = (name) => name.replace(/[A-Z]/g, "-$&").toLowerCase();

  return {
    name: "cally",

    packageLinkPhase({ customElementsManifest: manifest }) {
      const errors = [];
      const modules = [];

      for (const sf of program.getSourceFiles()) {
        if (
          !sf.fileName.startsWith(src) ||
          sf.isDeclarationFile ||
          /\.test\.|\/utils\/test/.test(sf.fileName)
        ) {
          continue;
        }

        for (const { className, tagName } of definitionsIn(sf)) {
          const fail = (message) => errors.push(`<${tagName}>: ${message}`);
          const modulePath = path.relative(root, sf.fileName);
          const analyzed = manifest.modules
            .find((m) => m.path === modulePath)
            ?.declarations?.find((d) => d.name === className);

          const classDecl = sf.statements.find(
            (s) => ts.isClassDeclaration(s) && s.name?.text === className,
          );
          if (!classDecl) continue;
          const classSymbol = checker.getSymbolAtLocation(classDecl.name);
          const instance = checker.getDeclaredTypeOfSymbol(classSymbol);
          const statics = checker.getTypeOfSymbolAtLocation(
            classSymbol,
            classDecl,
          );

          // props, from the `static props` table
          const propsSymbol = statics.getProperty("props");
          const propsTable = propsSymbol.valueDeclaration.initializer;
          const members = [];
          const attributes = [];

          // those of base classes come first, in the order they are declared
          const files = chainOf(classDecl).map((d) => d.getSourceFile());
          const propNames = checker
            .getPropertiesOfType(
              checker.getTypeOfSymbolAtLocation(propsSymbol, classDecl),
            )
            .map((p, i) => ({
              name: p.name,
              i,
              depth: files.indexOf(
                instance.getProperty(p.name).declarations[0].getSourceFile(),
              ),
            }))
            .sort((a, b) => b.depth - a.depth || a.i - b.i);

          for (const { name } of propNames) {
            const symbol = instance.getProperty(name);
            const type = checker.getTypeOfSymbolAtLocation(symbol, classDecl);
            const def = findPropDef(propsTable, name);
            const initial =
              def && ts.isArrayLiteralExpression(def)
                ? def.elements[1]
                : undefined;

            const description =
              analyzed?.members?.find((m) => m.name === name)?.description ??
              describe(symbol);
            if (!description) fail(`prop "${name}" has no description`);

            const item = {
              name,
              type: { text: typeOf(symbol.declarations[0], type) },
              // a default which refers to something internal is meaningless outside
              default: !initial
                ? "undefined"
                : ts.isIdentifier(initial)
                  ? undefined
                  : initial.getText(),
              description,
            };

            // functions can only be set as properties
            const isFunction =
              checker.getNonNullableType(type).getCallSignatures().length > 0;
            const attribute = isFunction ? undefined : toAttr(name);

            members.push({ kind: "field", ...item, attribute });
            if (attribute)
              attributes.push({ ...item, name: attribute, fieldName: name });
          }

          // public methods, as found by the analyzer
          for (const member of analyzed?.members ?? []) {
            if (
              member.kind === "method" &&
              !member.static &&
              (!member.privacy || member.privacy === "public") &&
              !member.name.startsWith("#")
            ) {
              // the analyzer has only the source text for types, so print them properly
              const decl = instance.getProperty(member.name)?.valueDeclaration;
              const parameters = member.parameters?.map((param, i) => {
                const node = decl?.parameters?.[i];
                const type =
                  node &&
                  checker.getNonNullableType(checker.getTypeAtLocation(node));
                if (!type) return param;
                const text =
                  node.type && !node.questionToken
                    ? printNode(node.type)
                    : print(type);
                return { ...param, type: { text } };
              });

              const signature =
                decl && checker.getSignatureFromDeclaration(decl);
              const returns = signature && print(signature.getReturnType());

              members.push(
                strip({
                  ...member,
                  parameters,
                  return: returns ? { type: { text: returns } } : member.return,
                }),
              );
            }
          }

          // events, from the `Events` type argument of the base class
          const eventsSymbol = instance.getProperty("_events");
          const eventsType = checker.getNonNullableType(
            checker.getTypeOfSymbolAtLocation(eventsSymbol, classDecl),
          );
          const events = checker
            .getPropertiesOfType(eventsType)
            .map((symbol, i) => ({
              symbol,
              i,
              depth: files.indexOf(symbol.declarations[0].getSourceFile()),
            }))
            // those of base classes come first, in the order they are declared
            .sort((a, b) => b.depth - a.depth || a.i - b.i)
            .map(({ symbol }) => {
              const detail = checker.getTypeOfSymbol(symbol);
              const description = describe(symbol);
              if (!description)
                fail(`event "${symbol.name}" has no description`);

              return {
                name: symbol.name,
                type: {
                  text:
                    detail.flags & ts.TypeFlags.Undefined
                      ? "Event"
                      : `CustomEvent<${typeOf(symbol.declarations[0], detail)}>`,
                },
                description,
              };
            });

          // slots, parts and custom properties are checked against the source
          const chain = chainOf(classDecl).map((decl) => decl.getSourceFile());
          const template = templateOf(chain);
          const slots = (analyzed?.slots ?? []).map(strip);
          const cssParts = (analyzed?.cssParts ?? []).map(strip);
          const declared = cssPropertiesOf(chain);
          const cssProperties = (analyzed?.cssProperties ?? []).map((prop) => ({
            ...strip(prop),
            default: declared.get(prop.name),
          }));

          for (const slot of template.slots) {
            if (!slots.some((s) => s.name === slot)) {
              fail(
                `slot "${slot}" is in the template, but not documented with @slot`,
              );
            }
          }
          for (const { name } of slots) {
            if (!template.slots.has(name)) {
              fail(`slot "${name}" is documented, but not in the template`);
            }
          }
          for (const part of template.parts) {
            if (!cssParts.some((p) => p.name === part)) {
              fail(
                `part "${part}" is in the template, but not documented with @csspart`,
              );
            }
          }
          for (const name of declared.keys()) {
            if (!cssProperties.some((p) => p.name === name)) {
              fail(
                `custom property "${name}" is in the styles, but not documented with @cssprop`,
              );
            }
          }
          for (const { name } of cssProperties) {
            if (!declared.has(name)) {
              fail(
                `custom property "${name}" is documented, but not in the styles`,
              );
            }
          }

          if (!analyzed?.description) fail("has no description");

          const module = `dist/${tagName}.js`;
          const declaration = { name: className, module };

          modules.push({
            kind: "javascript-module",
            path: module,
            declarations: [
              {
                kind: "class",
                name: className,
                description: analyzed?.description,
                tagName,
                customElement: true,
                members: nonEmpty(members),
                attributes: nonEmpty(attributes),
                events: nonEmpty(events),
                slots: nonEmpty(slots),
                cssParts: nonEmpty(cssParts),
                cssProperties: nonEmpty(cssProperties),
              },
            ],
            exports: [
              { kind: "js", name: className, declaration },
              { kind: "custom-element-definition", name: tagName, declaration },
            ],
          });
        }
      }

      manifest.modules = modules.sort((a, b) => a.path.localeCompare(b.path));

      if (errors.length) {
        console.error(
          `\nThe custom elements manifest is incomplete:\n\n  ${errors.join("\n  ")}\n`,
        );
        process.exitCode = 1;
      }
    },
  };
}
