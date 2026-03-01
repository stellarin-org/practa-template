import { execSync } from "child_process";
import * as path from "path";
import * as fs from "fs";

interface TestResult {
  passed: boolean;
  passCount: number;
  failCount: number;
  failLines: string[];
}

function runTestFile(testFile: string, projectRoot: string): TestResult {
  try {
    const output = execSync(`node --import tsx --test ${testFile}`, {
      cwd: projectRoot,
      encoding: "utf-8",
      timeout: 30000,
    });

    const passMatch = output.match(/pass (\d+)/);
    const failMatch = output.match(/fail (\d+)/);

    return {
      passed: true,
      passCount: passMatch ? parseInt(passMatch[1], 10) : 0,
      failCount: failMatch ? parseInt(failMatch[1], 10) : 0,
      failLines: [],
    };
  } catch (error: unknown) {
    const execError = error as { stdout?: string; stderr?: string };
    const combined = (execError.stdout || "") + (execError.stderr || "");

    const failLines = combined
      .split("\n")
      .filter((l: string) => l.includes("\u2716"))
      .map((l: string) => l.trim());

    const passMatch = combined.match(/pass (\d+)/);
    const failMatch = combined.match(/fail (\d+)/);

    return {
      passed: false,
      passCount: passMatch ? parseInt(passMatch[1], 10) : 0,
      failCount: failMatch ? parseInt(failMatch[1], 10) : 0,
      failLines,
    };
  }
}

function discoverDevTests(projectRoot: string): string[] {
  const devTestDir = path.join(projectRoot, "client/my-practa/dev-build-tests");

  if (!fs.existsSync(devTestDir)) {
    return [];
  }

  try {
    return fs
      .readdirSync(devTestDir)
      .filter((f) => f.endsWith(".test.ts") || f.endsWith(".test.js"))
      .map((f) => path.join(devTestDir, f))
      .sort();
  } catch {
    return [];
  }
}

export function runStartupTests(): { passed: boolean; summary: string } {
  const projectRoot = process.cwd();

  const templateTestFile = path.join(projectRoot, "tests/metadata.test.ts");
  const devTestFiles = discoverDevTests(projectRoot);

  const allTestFiles = [templateTestFile, ...devTestFiles];
  let totalPass = 0;
  let totalFail = 0;
  const allFailLines: string[] = [];

  for (const testFile of allTestFiles) {
    if (!fs.existsSync(testFile)) continue;

    const label = testFile.includes("dev-build-tests") ? "practa" : "template";
    const result = runTestFile(testFile, projectRoot);

    totalPass += result.passCount;
    totalFail += result.failCount;

    if (!result.passed && result.failLines.length > 0) {
      allFailLines.push(`[${label}] ${result.failLines.join(`, [${label}] `)}`);
    }
  }

  const summary = `${totalPass} passed, ${totalFail} failed${allFailLines.length > 0 ? "\n" + allFailLines.join("\n") : ""}`;

  return {
    passed: totalFail === 0,
    summary,
  };
}
