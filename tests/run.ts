import { execSync } from "child_process";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const testFile = path.join(__dirname, "metadata.test.ts");

try {
  execSync(`node --import tsx --test ${testFile}`, {
    stdio: "inherit",
    cwd: path.resolve(__dirname, ".."),
  });
  process.exit(0);
} catch {
  process.exit(1);
}
