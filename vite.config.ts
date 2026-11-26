import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import { readCloudConfig } from "./src/cloud-config.ts";
import { contentSecurityPolicy } from "./src/site-policy.ts";

export default defineConfig(({ mode }) => {
  const useEmulators = mode === "test";
  const cloud = useEmulators
    ? {
        apiKey: "fake-emulator-key",
        authDomain: "demo-motornews.firebaseapp.com",
        projectId: "demo-motornews",
        appId: "1:123:web:abc123",
      }
    : mode === "test-static"
      ? null
      : readCloudConfig(loadEnv(mode, process.cwd(), "FIREBASE_"));
  const csp = contentSecurityPolicy(useEmulators);
  return {
    base: "./",
    server: { hmr: false },
    preview: { headers: { "Content-Security-Policy": csp } },
    plugins: [
      {
        name: "motornews-csp",
        transformIndexHtml: () => [
          {
            tag: "meta",
            attrs: {
              "http-equiv": "Content-Security-Policy",
              content: csp.replace(/; frame-ancestors [^;]+/, ""),
            },
            injectTo: "head-prepend",
          },
        ],
      },
    ],
    define: {
      __CLOUD_CONFIG__: JSON.stringify(cloud),
      __USE_EMULATORS__: JSON.stringify(useEmulators),
    },
    build: {
      rollupOptions: {
        input: {
          terminal: fileURLToPath(new URL("./index.html", import.meta.url)),
          legacy: fileURLToPath(
            new URL("./s2k_engineering_terminal.html", import.meta.url),
          ),
        },
      },
    },
  };
});
