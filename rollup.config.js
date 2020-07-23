import svelte from "rollup-plugin-svelte"
import commonjs from "@rollup/plugin-commonjs"
import resolve from "@rollup/plugin-node-resolve"
import { terser } from "rollup-plugin-terser"

// We don't need to alias when importing from 'svelthree-three'
//import alias from "@rollup/plugin-alias"

import pkg from "./package.json"
import preprocess from "svelte-preprocess"
import typescript from "@rollup/plugin-typescript"

const devMode = false
const production = !process.env.ROLLUP_WATCH
const bannerString = "/**\n" +
"* SVELTHREE " + pkg.version + "\n" +
"* Svelte (@see https://svelte.dev/) components library utilizing three.js (@see https://threejs.org/) source in a slightly extended version (@see https://github.com/vatro/svelthree-three).\n"+
"* This is a bundled and minified version of svelthree, so all code-comments (incl. all authors) have been stripped.\n" +
"* @author svelthree: Vatroslav Vrbanic / @see https://github.com/vatro\n"+
"* @author threejs: mrdoob / @see https://github.com/mrdoob + contributors, @see https://github.com/mrdoob/three.js/graphs/contributors\n"+
"* @author svelte: Rich Harris / @see https://github.com/Rich-Harris + contributors, @see https://github.com/sveltejs/svelte/graphs/contributors\n"+
"* @licence MIT\n"+
"*/";

export default {
    input: "src/svelthree.js",
    //we inserted this
    treeshake: { moduleSideEffects: false },

    output: [
        /* 
		The attempt to generate *.d.ts from *.svelte component's ts-code failed.
		Rollup generates *.d.ts of *.ts files only, not of ts-code inside <script lang="typescript">!
		Doing <script lang="typescript" src="Foo.ts">:
		- component Foo.svelte gets bundled correctly (works)
		- Foo.d.ts gets exported but is not wrapped into a 'SvelteComponent' class or similar (is completely detached),
		so pointing to it in the svelthree.d.ts like `export * as WebGLRenderer from "./components/WebGLRenderer"`
		is useless / obsolete.
		*/
        /*
		{
			dir: "./dist",
			format: 'es',
			sourcemap: devMode
		}
		*/

        { banner: bannerString, file: pkg.module, format: "es", sourcemap: devMode },
        { banner: bannerString, file: pkg.main, format: "umd", name:"svelthree", sourcemap: devMode}
    ],
    plugins: [
        svelte({
            preprocess: preprocess({
                typescript: {
                    /**
					 * Optionally specify the directory to load the tsconfig from
					 
					tsconfigDirectory: './configs',
					*/

                    /**
                     * Optionally specify the full path to the tsconfig
                     */
                    //tsconfigFile: './tsconfig.json',

                    /**
					 * Optionally specify compiler options.
					 * These will be merged with options from the tsconfig if found.
					 
					compilerOptions: {
					  module: 'es2015',
					},
					*/

                    /**
                     * Type checking can be skipped by setting 'transpileOnly: true'.
                     * This speeds up your build process.
                     */
                    //  WHY?  This must be true, otherwise the build fails.
                    //  WHY?  Update: it doesn't fail anymore, leave it true.
                    transpileOnly: true
                }
            })
        }),

		// We don't need to alias when importing from 'svelthree-three'
		// see  '"svelte": "src/Three.js"' in svelthree-three's package.json
		/*
        alias({
            entries: [
                {
					//import from three source on build
                    find: "three",
                    replacement: __dirname + "/node_modules/svelthree-three/src/Three"
                }
            ]
		}),
		*/

        resolve({
            browser: true,
            dedupe: ["svelte"]
        }),
        commonjs(),
        typescript(),

        !devMode && terser({
            output: {
              comments: function (node, comment) {
                var text = comment.value;
                var type = comment.type;
                if (type == "comment2") {
                  // multiline comment
                  return /@licence/i.test(text);
                }
              }
            },
              mangle: false,
              compress: {
                  pure_funcs: ["console.log", "console.info"]
              }
            }
        )
    ]
}
