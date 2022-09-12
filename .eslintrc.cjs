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
