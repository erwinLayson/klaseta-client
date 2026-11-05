import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const loaderPath = pathToFileURL(path.join(__dirname, "helpers", "testLoader.mjs")).href;

const testFiles = [
    "test/integration/migrations.test.ts",
    "test/unit/gradeCalculator.test.ts",
    "test/unit/nameNormalization.test.ts",
    "test/integration/auth.test.ts",
    "test/integration/schoolYearService.test.ts",
    "test/integration/myClass.test.ts",
    "test/integration/attendance.test.ts",
    "test/integration/gradebook.test.ts",
    "test/integration/academicHistory.test.ts",
    "test/integration/dashboard.test.ts",
    "test/integration/settings.test.ts",
    "test/e2e/academicLifecycle.test.ts",
];

const child = spawn(
    process.execPath,
    ["--test", "--experimental-strip-types", "--loader", loaderPath, ...testFiles],
    { stdio: "inherit", shell: false }
);

child.on("exit", (code) => {
    process.exit(code ?? 0);
});

