import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Server documents are schemaless JSON rows (as they were with Mongoose)
    files: ["src/server/**/*.ts"],
    rules: { "@typescript-eslint/no-explicit-any": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // One-off CommonJS scripts at the repo root (logo editing etc.), not app code.
    "crop_logo.js",
    "generate-logo.js",
    "resize_logo.js",
  ]),
]);

export default eslintConfig;
