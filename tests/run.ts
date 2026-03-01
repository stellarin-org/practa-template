import { execSync } from "child_process";
import * as path from "path";
import * as fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

function discoverTests(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".test.ts") || f.endsWith(".test.js"))
    .map((f) => path.join(dir, f))
    .sort();
}

const templateTests = discoverTests(__dirname);
const practaTestDir = path.join(projectRoot, "client/my-practa/tests");
const practaTests = discoverTests(practaTestDir);
const allTests = [...templateTests, ...practaTests];

const testArgs = allTests.map((f) => `--test ${f}`).join(" ");

console.log(`Running ${allTests.length} test file(s)...`);
console.log(`  Template: ${templateTests.length} file(s)`);
templateTests.forEach((f) => console.log(`    ${path.relative(projectRoot, f)}`));
if (practaTests.length > 0) {
  console.log(`  Practa:   ${practaTests.length} file(s)`);
  practaTests.forEach((f) => console.log(`    ${path.relative(projectRoot, f)}`));
}

try {
  execSync(`node --import tsx ${testArgs}`, {
    stdio: "inherit",
    cwd: projectRoot,
  });
  process.exit(0);
} catch {
  process.exit(1);
}
