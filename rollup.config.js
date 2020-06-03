import svelte from 'rollup-plugin-svelte';
import resolve from '@rollup/plugin-node-resolve';
import {terser} from 'rollup-plugin-terser';
import alias from '@rollup/plugin-alias';
import pkg from './package.json';

/*
svelte-preprocess for TypeScript support is installed, but is currently not being, as we don't
use TS in current prototyping phase. Considering rewriting once everything fits first needs.
 */
import autoPreprocess from "svelte-preprocess"


const name = pkg.name
	.replace(/^(@\S+\/)?(svelte-)?(\S+)/, '$3')
	.replace(/^\w/, m => m.toUpperCase())
	.replace(/-\w/g, m => m[1].toUpperCase());

const useTerser = true;
const production = !process.env.ROLLUP_WATCH;

export default {
	input: 'src/index.js',
	treeshake: { moduleSideEffects: false },
	output: [
		{ file: pkg.module, 'format': 'es' },
		{ file: pkg.main, 'format': 'umd', name }
	],
	plugins: [
		alias({
			entries: [
				{
					find: 'three',
					replacement: __dirname + '/node_modules/three/src/Three'
				},
				{
					find: 'threesrc',
					replacement: __dirname + '/node_modules/three/src'
				}
			],
		}),
		svelte({
			/*
			installed, but currently not being used, no TypeScript.
			 */
			preprocess: autoPreprocess()
		}),
		resolve({
			browser: true,
			dedupe: ['svelte']
		}),
		useTerser && terser({
			output: {
				comments: "some"
			},
			mangle: false,
			compress: {
				pure_funcs: ['console.log']
			}
		})
	]
};
