// see https://vitejs.dev/guide/build.html#library-mode
import { resolve } from "path"
import { defineConfig } from "vite"
import { svelte } from "@sveltejs/vite-plugin-svelte"
import sveltePreprocess from "svelte-preprocess"

export default defineConfig({
	plugins: [
		svelte({
			compilerOptions: {
				generate: "ssr"
			},
			preprocess: sveltePreprocess({ typescriot: true }),
			// see https://github.com/sveltejs/vite-plugin-svelte/blob/93ca647767c683d9f8996e670ae5c1b8171adc21/packages/vite-plugin-svelte/src/utils/options.ts#L260
			hot: {
				acceptAccessors: true
			}
		})
	],

	// TODO  This does generate an SSR version, but:
	// - 'three' etc. are not included in build (only Svelte components)
	// - format, filename (how?), doing it via rollupOptions always throws an error.
	// - rollupOptions need to be tweaked properly (throws an error with 'output.filename' or 'output.dir' specified)
	// - DO WE EVEN NEED AN SSR-BUILD? I rather don't think so anymore, after successful deployment via Vercel -> see https://github.com/vatro/svelthree/issues/48.

	build: {
		// ssr
		ssr: true,
		rollupOptions: {
			input: {
				svelthree: resolve(__dirname, "src/index.js")
			}
		},
		ssr: {
			noExternal: true,
			target: "node"
		},

		// works
		outDir: "./dist/ssr",
		emptyOutDir: false
	}
})
