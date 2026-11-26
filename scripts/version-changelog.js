// Run by `npm version` (via the "version" script) after package.json is bumped
// but before the version commit/tag. Renames the "Unreleased" section of the
// changelog to the new version, so the changelog lands in the tagged commit.
// A fresh, empty "Unreleased" section is added for the next release.
import { readFile, writeFile } from "node:fs/promises";

const file = new URL("../CHANGELOG.md", import.meta.url);
const version = process.env.npm_package_version;

if (!version) {
  throw new Error("npm_package_version not set; run via `npm version`");
}

const changelog = await readFile(file, "utf8");
const heading = "## Unreleased";
const start = changelog.indexOf(heading);

if (start === -1) {
  throw new Error(`No "${heading}" section in CHANGELOG.md`);
}

const nextSection = changelog.indexOf("\n## ", start + heading.length);
const body = changelog.slice(
  start + heading.length,
  nextSection === -1 ? undefined : nextSection
);

if (!body.trim()) {
  throw new Error(`"${heading}" section in CHANGELOG.md is empty`);
}

const date = new Date().toISOString().slice(0, 10);
const updated =
  changelog.slice(0, start) +
  `${heading}\n\n## \`${version}\`\n\n_Released: ${date}_` +
  changelog.slice(start + heading.length);

await writeFile(file, updated);
