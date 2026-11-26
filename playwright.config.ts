import { defineConfig } from "@playwright/test";

const staticUrl = process.env.MOTORNEWS_STATIC_URL ?? "http://127.0.0.1:4173";
const cloudUrl = "http://127.0.0.1:4174";
const useEmulators = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const run = useEmulators ? "cloud" : "static";

export default defineConfig({
  testDir: "./tests",
  forbidOnly: Boolean(process.env.CI),
  workers: 2,
  outputDir: `test-results/${run}`,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: `playwright-report/${run}` }],
  ],
  use: { trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [
    {
      name: "static",
      testMatch: "static.spec.ts",
      use: { baseURL: staticUrl },
    },
    {
      name: "cloud",
      testMatch: ["cloud.spec.ts", "firestore.spec.ts"],
      use: { baseURL: cloudUrl },
    },
  ],
  webServer: useEmulators
    ? {
        command:
          "npm run build -- --mode test --outDir test-results/build-cloud && npm run preview -- --mode test --outDir test-results/build-cloud --host 127.0.0.1 --port 4174 --strictPort",
        url: cloudUrl,
      }
    : process.env.MOTORNEWS_STATIC_URL
      ? undefined
      : {
          command:
            "npm run build -- --mode test-static --outDir test-results/build-static && npm run preview -- --outDir test-results/build-static --host 127.0.0.1 --port 4173 --strictPort",
          url: staticUrl,
        },
});
