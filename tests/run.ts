import { execSync } from "child_process";
import * as path from "path";
import * as fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const templateTest = path.join(__dirname, "metadata.test.ts");

const devTestDir = path.join(projectRoot, "client/my-practa/dev-build-tests");
const devTests: string[] = [];
if (fs.existsSync(devTestDir)) {
  for (const f of fs.readdirSync(devTestDir)) {
    if (f.endsWith(".test.ts") || f.endsWith(".test.js")) {
      devTests.push(path.join(devTestDir, f));
    }
  }
  devTests.sort();
}

const allTests = [templateTest, ...devTests];
const testArgs = allTests.map((f) => `--test ${f}`).join(" ");

console.log(`Running ${allTests.length} test file(s)...`);
if (devTests.length > 0) {
  console.log(`  Template tests: tests/metadata.test.ts`);
  devTests.forEach((f) => console.log(`  Practa tests: ${path.relative(projectRoot, f)}`));
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
