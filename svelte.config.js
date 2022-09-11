import adapter from "@sveltejs/adapter-auto"
import preprocess from "svelte-preprocess"

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://github.com/sveltejs/svelte-preprocess
	// for more information about preprocessors
	preprocess: preprocess(),

	kit: {
		adapter: adapter(),

		alias: {
			"$app/env": "./src/lib/$app/env/index.ts",
			"svelthree/stores": "./src/lib/stores/index.ts",
			svelthree: "./src/lib/index.ts",
			"svelthree/*": "./src/lib/*"
		}
	},

	package: {
		dir: "package",
		emitTypes: true,
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		exports: (filepath) => {
			if (filepath.startsWith(`index.ts`)) return true
			if (filepath.startsWith(`utils/index`)) return true
			if (filepath.startsWith(`stores/index`)) return true
		}
	}
}

export default config
