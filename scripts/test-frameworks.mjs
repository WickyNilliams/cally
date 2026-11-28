// Tests cally in each framework under tests/frameworks, as it would be
// installed from npm. Pass the names of frameworks to test only those.
//
//   npm run test:frameworks
//   npm run test:frameworks -- react vue
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const frameworksDir = join(root, "tests/frameworks");
// each app has its own package.json. anything else, e.g. the shared tests, isn't one
const all = readdirSync(frameworksDir, { withFileTypes: true })
  .filter((entry) =>
    existsSync(join(frameworksDir, entry.name, "package.json")),
  )
  .map((entry) => entry.name);

const names = process.argv.slice(2);
const unknown = names.filter((name) => !all.includes(name));
if (unknown.length) {
  console.error(
    `Unknown frameworks: ${unknown.join(", ")}. Expected any of: ${all.join(", ")}`,
  );
  process.exit(1);
}

const run = (cwd, command, ...args) => {
  console.log(
    `\n> ${command} ${args.join(" ")}  (in ${cwd.replace(root, ".") || "."})`,
  );
  try {
    execFileSync(command, args, { cwd, stdio: "inherit" });
  } catch {
    // the command has already said what went wrong
    process.exit(1);
  }
};

// pack the package as it would be published, so that what is tested is
// exactly what people install
run(root, "npx", "vite", "build");
const packDir = mkdtempSync(join(tmpdir(), "cally-pack-"));
run(root, "npm", "pack", "--pack-destination", packDir);
const tarball = join(packDir, readdirSync(packDir)[0]);

for (const name of names.length ? names : all) {
  const dir = join(frameworksDir, name);
  run(dir, "npm", "ci");
  // not saved, so the lockfile only pins the framework and tooling
  run(dir, "npm", "install", "--no-save", tarball);
  run(dir, "npm", "run", "check");
  run(dir, "npm", "test");
}
