const { rules } = require("eslint-config-prettier")

module.exports = {
	root: true,
	parser: "@typescript-eslint/parser",
	extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended", "prettier"],
	plugins: ["svelte3", "@typescript-eslint"],

	//(default) check *.svelte and *.ts files
	ignorePatterns: ["*.cjs"],

	// check only *.svelte files
	//ignorePatterns: ["*.cjs", "*.ts"],

	overrides: [
		{
			files: ["*.svelte"],
			processor: "svelte3/svelte3"

			// checking specific rules (set to "off" / "error")
			// errors only
			/* rules: {
				"no-inferrable-types": "error",
				"no-undef": "error",
				"no-empty": "error",
				"no-case-declarations": "error",
				"no-prototype-builtins": "error"
			} */
		},
		// see: https://typescript-eslint.io/docs/linting/troubleshooting/#i-get-errors-from-the-no-undef-rule-about-global-variables-not-being-defined-even-though-there-are-no-typescript-errors
		{
			files: ["*.ts", "*.mts", "*.cts", "*.tsx", "*.svelte"],
			rules: {
				"no-undef": "off"
			}
		}
	],
	settings: {
		"svelte3/typescript": () => require("typescript")
	},
	parserOptions: {
		sourceType: "module",
		ecmaVersion: 2020
	},
	env: {
		browser: true,
		es2017: true,
		node: true
	}
}
