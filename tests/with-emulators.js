import process from "node:process";
import { spawnSync } from "node:child_process";
import { error } from "node:console";
import { delimiter, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const node = process.execPath;
const insideEmulators = process.argv.includes("--inside-emulators");
const result = insideEmulators
  ? spawnSync(
      node,
      ["./node_modules/@playwright/test/cli.js", "test", "--project=cloud"],
      {
        // Standalone Firebase CLI prepends its bundled Node to PATH.
        env: {
          ...process.env,
          PATH: dirname(node) + delimiter + process.env.PATH,
        },
        stdio: "inherit",
      },
    )
  : spawnSync(
      "firebase",
      [
        "emulators:exec",
        "--project",
        "demo-motornews",
        "--only",
        "auth,firestore",
        `"${node}" "${fileURLToPath(import.meta.url)}" --inside-emulators`,
      ],
      { stdio: "inherit" },
    );

if (result.error) error(result.error.message);
process.exitCode = result.status ?? 1;
