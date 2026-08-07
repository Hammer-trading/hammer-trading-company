import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
  recommendedConfig: js.configs.recommended
});

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      ".vercel/**",
      ".codex/**",
      "node_modules/**",
      "publish-build/**",
      "*.zip",
      "*.log",
      "*.err.log",
      "next-env.d.ts",
      "tsconfig.tsbuildinfo"
    ]
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    files: ["**/*.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off"
    }
  }
];

export default eslintConfig;
