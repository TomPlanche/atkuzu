import { fileURLToPath } from "node:url";
import { includeIgnoreFile } from "@eslint/compat";
import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import svelte from "eslint-plugin-svelte";
import { defineConfig } from "eslint/config";
import globals from "globals";
import ts from "typescript-eslint";
import svelteConfig from "./svelte.config.js";

const gitignorePath = fileURLToPath(new URL("./.gitignore", import.meta.url));

export default defineConfig(
  includeIgnoreFile(gitignorePath), // oxlint covers plain .ts/.js/.mjs/.cjs; ESLint is scoped to .svelte files
  // only, for eslint-plugin-svelte's template/reactivity/a11y rules that
  // oxlint doesn't have.
  {
    ignores: [
      "**/*.ts",
      "**/*.mts",
      "**/*.cts",
      "**/*.js",
      "**/*.mjs",
      "**/*.cjs",
      "!**/*.svelte.ts",
      "!**/*.svelte.js"
    ]
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  ...svelte.configs.recommended, // Disables rules from the configs above that fight oxfmt's formatting.
  // Placed before our own rules block so the deliberate style rules there
  // (curly, quotes, semi, ...) still win.
  prettier,
  ...svelte.configs.prettier,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node }
    },
    rules: {
      // typescript-eslint strongly recommend that you do not use the no-undef lint rule on TypeScript projects.
      // see: https://typescript-eslint.io/troubleshooting/faqs/eslint/#i-get-errors-from-the-no-undef-rule-about-global-variables-not-being-defined-even-though-there-are-no-typescript-errors
      "no-undef": "off",
      quotes: ["error", "double"],
      semi: ["error", "always"],
      "object-curly-spacing": ["error", "always"],
      curly: ["error", "all"],
      "brace-style": ["error", "1tbs", { allowSingleLine: false }], // No `function` declarations, always `const foo = (...) => {}`.
      "func-style": ["error", "expression", { allowArrowFunctions: true }], // No `function` expressions either, except where an arrow can't stand in
      // (class methods/constructors, object getters/setters, generators).
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "FunctionExpression[generator=false]:not(MethodDefinition > FunctionExpression):not(Property[method=true] > FunctionExpression):not(Property[kind=/^(get|set)$/] > FunctionExpression)",
          message: "Use an arrow function instead of a function expression."
        }
      ]
    }
  },
  {
    files: ["**/*.svelte", "**/*.svelte.ts", "**/*.svelte.js"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        extraFileExtensions: [".svelte"],
        parser: ts.parser,
        svelteConfig
      }
    }
  }
);
