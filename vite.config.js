// see https://vitejs.dev/guide/build.html#library-mode
import { resolve } from "path"
import { defineConfig } from "vite"
import { svelte } from "@sveltejs/vite-plugin-svelte"
import sveltePreprocess from "svelte-preprocess"

export default defineConfig({
	plugins: [
		svelte({
			preprocess: sveltePreprocess()
		})
	],
	build: {
		lib: {
			entry: resolve(__dirname, "src/index.js"),
			name: "svelthree",
			formats: ["es", "umd"],
			fileName: (format) => `svelthree.${format}.js`
		},
		outDir: "./dist",
		emptyOutDir: true
	}
})
