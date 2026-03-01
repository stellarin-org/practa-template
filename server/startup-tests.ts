import { execSync } from "child_process";
import * as path from "path";
import * as fs from "fs";

interface TestResult {
  passed: boolean;
  passCount: number;
  failCount: number;
  failLines: string[];
}

function runTestFiles(testFiles: string[], projectRoot: string): TestResult {
  const testArgs = testFiles.map((f) => `--test ${f}`).join(" ");

  try {
    const output = execSync(`node --import tsx ${testArgs}`, {
      cwd: projectRoot,
      encoding: "utf-8",
      timeout: 60000,
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
      .filter((l: string) => l.includes("\u2716") && !l.includes("failing tests"))
      .map((l: string) => l.trim())
      .filter((l: string) => l.length > 0);

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

function discoverTestFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];

  try {
    return fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".test.ts") || f.endsWith(".test.js"))
      .map((f) => path.join(dir, f))
      .sort();
  } catch {
    return [];
  }
}

export function runStartupTests(): { passed: boolean; summary: string } {
  const projectRoot = process.cwd();

  const templateTestDir = path.join(projectRoot, "tests");
  const mandatoryTest = path.join(templateTestDir, "metadata.test.ts");
  if (!fs.existsSync(mandatoryTest)) {
    return { passed: false, summary: "0 passed, 1 failed\n[template] missing required tests/metadata.test.ts" };
  }

  const templateTests = discoverTestFiles(templateTestDir);
  const practaTests = discoverTestFiles(path.join(projectRoot, "client/my-practa/tests"));
  const allTestFiles = [...templateTests, ...practaTests];

  if (allTestFiles.length === 0) {
    return { passed: true, summary: "no test files found" };
  }

  const templateResult = templateTests.length > 0
    ? runTestFiles(templateTests, projectRoot)
    : { passed: true, passCount: 0, failCount: 0, failLines: [] };

  const practaResult = practaTests.length > 0
    ? runTestFiles(practaTests, projectRoot)
    : { passed: true, passCount: 0, failCount: 0, failLines: [] };

  const totalPass = templateResult.passCount + practaResult.passCount;
  const totalFail = templateResult.failCount + practaResult.failCount;
  const allFailLines: string[] = [];

  if (templateResult.failLines.length > 0) {
    allFailLines.push(...templateResult.failLines.map((l) => `[template] ${l}`));
  }
  if (practaResult.failLines.length > 0) {
    allFailLines.push(...practaResult.failLines.map((l) => `[practa] ${l}`));
  }

  const summary = `${totalPass} passed, ${totalFail} failed${allFailLines.length > 0 ? "\n" + allFailLines.join("\n") : ""}`;

  return {
    passed: totalFail === 0,
    summary,
  };
}
