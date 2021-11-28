/*
import { defineConfig } from 'vite'
import svelte from '@sveltejs/vite-plugin-svelte'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [svelte({
	preprocess: sveltePreprocess(),
	// see https://github.com/sveltejs/vite-plugin-svelte/blob/93ca647767c683d9f8996e670ae5c1b8171adc21/packages/vite-plugin-svelte/src/utils/options.ts#L260
	hot: {
	  acceptAccessors: true
	}
  }
   
  )],
  resolve: {
	dedupe: ["three"]
  },
  rollupdedupe: ['svelte']
})
*/


// see https://github.com/sveltejs/vite-plugin-svelte/tree/main/packages/vite-plugin-svelte

// vite.config.js
// see https://vitejs.dev/guide/build.html
// see https://vitejs.dev/config/

/*
import { svelte } from "@sveltejs/vite-plugin-svelte"
import sveltePreprocess from "svelte-preprocess"
import { defineConfig } from "vite"

export default defineConfig(({ command, mode }) => {
	const isProduction = mode === "production"
	return {
		plugins: [
			svelte({
				preprocess: sveltePreprocess(),
				// see https://github.com/sveltejs/vite-plugin-svelte/blob/93ca647767c683d9f8996e670ae5c1b8171adc21/packages/vite-plugin-svelte/src/utils/options.ts#L260
				hot: {
					acceptAccessors: true
				}
			})
		],
		resolve: {
			dedupe: ["three"],
			mainFields: ["modules", "main"]
		  },
		rollupdedupe: ['svelte'],
		build: {
			minify: isProduction
		}
	}
})
*/

/*
import { defineConfig } from 'vite'
import { svelte } from "@sveltejs/vite-plugin-svelte"
import sveltePreprocess from "svelte-preprocess"

// https://vitejs.dev/config/
module.exports = defineConfig({
	plugins: [svelte({
		preprocess: sveltePreprocess(),
		// see https://github.com/sveltejs/vite-plugin-svelte/blob/93ca647767c683d9f8996e670ae5c1b8171adc21/packages/vite-plugin-svelte/src/utils/options.ts#L260
		hot: {
			acceptAccessors: true
		}
	}

	)],
	resolve: {
		dedupe: ["three"],
		mainFields: ["module"]
	},
	rollupdedupe: ['svelte']
})
*/

// see https://vitejs.dev/guide/build.html#library-mode
import { resolve } from 'path'
import { defineConfig } from 'vite'
import { svelte } from "@sveltejs/vite-plugin-svelte"
import sveltePreprocess from "svelte-preprocess"

export default defineConfig({
	plugins: [svelte({
		preprocess: sveltePreprocess(),
		// see https://github.com/sveltejs/vite-plugin-svelte/blob/93ca647767c683d9f8996e670ae5c1b8171adc21/packages/vite-plugin-svelte/src/utils/options.ts#L260
		hot: {
			acceptAccessors: true
		}
	}

	)],
	build: {
		lib: {
			entry: resolve(__dirname, 'src/index.js'),
			name: 'svelthree',
			fileName: (format) => `svelthree.${format}.js`
		},

		/*
		,
		rollupOptions: {
			// make sure to externalize deps that shouldn't be bundled
			// into your library
			external: ['vue'],
			output: {
				// Provide global variables to use in the UMD build
				// for externalized deps
				globals: {
					vue: 'Vue'
				}
			}
		}
		*/
	}
})
