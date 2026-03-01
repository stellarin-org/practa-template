import { execSync } from "child_process";
import * as path from "path";

export function runStartupTests(): { passed: boolean; summary: string } {
  const projectRoot = process.cwd();
  const testFile = path.join(projectRoot, "tests/metadata.test.ts");

  try {
    const output = execSync(`node --import tsx --test ${testFile}`, {
      cwd: projectRoot,
      encoding: "utf-8",
      timeout: 30000,
    });

    const passMatch = output.match(/pass (\d+)/);
    const failMatch = output.match(/fail (\d+)/);
    const passCount = passMatch ? parseInt(passMatch[1], 10) : 0;
    const failCount = failMatch ? parseInt(failMatch[1], 10) : 0;

    return {
      passed: failCount === 0,
      summary: `${passCount} passed, ${failCount} failed`,
    };
  } catch (error: unknown) {
    const execError = error as { stdout?: string; stderr?: string };
    const combined = (execError.stdout || "") + (execError.stderr || "");
    const failLines = combined
      .split("\n")
      .filter((l: string) => l.includes("✖"))
      .map((l: string) => l.trim());

    const passMatch = combined.match(/pass (\d+)/);
    const failMatch = combined.match(/fail (\d+)/);
    const passCount = passMatch ? parseInt(passMatch[1], 10) : 0;
    const failCount = failMatch ? parseInt(failMatch[1], 10) : 0;

    return {
      passed: false,
      summary: `${passCount} passed, ${failCount} failed${failLines.length > 0 ? "\n" + failLines.join("\n") : ""}`,
    };
  }
}
