import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig(
  { ignores: ["dist/**", "test-results/**", "playwright-report/**"] },
  js.configs.recommended,
  tseslint.configs.recommended,
);
