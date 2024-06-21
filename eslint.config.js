// eslint.config.js

import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
	js.configs.recommended,
	...tseslint.configs.recommended,
	{
		files: ["src/**/*.ts", "tests/**/*.ts"],
		rules: {
			"@typescript-eslint/no-explicit-any": "off",
			"no-useless-escape": "off",
			"no-mixed-spaces-and-tabs": "off",
			"no-constant-condition": "off",
			"no-irregular-whitespace": "off",
			eqeqeq: [
				"error",
				"always",
				{
					null: "ignore",
				},
			],
			"no-return-await": "error",
			"@typescript-eslint/no-empty-function": "warn",
			"no-var": "error",
			"spaced-comment": ["warn", "always", { exceptions: ["?"] }],
			"max-lines": ["error", { max: 2000, skipBlankLines: true }],
			"no-await-in-loop": "error",
			"class-methods-use-this": "error",
			"no-template-curly-in-string": "warn",
			"no-extra-semi": "off",
			"no-cond-assign": ["error", "except-parens"],
			yoda: "error",
			"no-confusing-arrow": "error",
			"no-invalid-this": "error",
			"no-labels": "error",
			"no-new-func": "error",
			"no-new": "error",
			"no-plusplus": ["warn", { allowForLoopAfterthoughts: true }],
			"no-param-reassign": "error",
			"no-undef-init": "error",
			"prefer-rest-params": "error",
			"no-unused-vars": "off",
			"@typescript-eslint/no-unused-vars": "warn",
		},
	},
];
