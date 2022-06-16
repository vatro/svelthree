# svelthree changelog

### 1.0.0-next.0.75

- ( **!** ) Render mode `auto`: `render_scheduled.status = false` has been **moved to end** of the `render_standard()` function, because `on:before_render` **was scheduling multiple renders in a single AnimationFrame** (*on change*)! Putting `render_scheduled.status = false` to the very start of the `render_standard()` function **was completely false**! [[07120b0](https://github.com/vatro/svelthree/commit/07120b002240dd5a62f0db7a2501664dafb64f40)]
- Closed [#72](https://github.com/vatro/svelthree/issues/72) -> Now, shadow DOM elements will be added / appended correctly, even for svelthree-components inside non-svelthree 'wrapper' / 'container' components. This is rather a "DUCKTAPE"-fix, because the observed problematic behavior where context was received in wrong order has something to do with Svelte, not svelthree. A **corresponding Svelte issue** has been submitted, see: [**Context value received in wrong order if `bind:this` is set on a slot**](https://github.com/sveltejs/svelte/issues/7606).
- Silenced Chromium `Event.path` deprecation warning [[4a1b781](https://github.com/vatro/svelthree/commit/4a1b7812e3f67195f2397505b199e19211cd275f)]



### 1.0.0-next.0.74

- Cleaned up / refactored `add_instance_to()` method and other related logic [#71](https://github.com/vatro/svelthree/issues/71)
- Removed funding via Patreon -> if you'd like to support me, please use GitHub sponsoring! Thanks! 😁



### 1.0.0-next.0.72

- Fix `LinkProp` type



### 1.0.0-next.0.71

- Allow handling clickable components / three.js object instances as `<a>` and `<button>` ([#68](https://github.com/vatro/svelthree/issues/68))
	- New `button` and `link` props.
	- New types: `SvelthreeShadowDOMElement`, `ButtonProp`, `LinkProp`.
	- Slightly changed `aria` prop handling logic:
		- Always add `ariaLabel` to shadow DOM if specified.
		- Add `ariaLabel` as `innerText` to shadow DOM `<div>`s only.



### 1.0.0-next.0.70

**Major refactor** incl. new interactivity, event handling / event propagation and accessability concept using shadow DOM. Most (important) changes were made to `SvelthreeInteraction` and `WebGLRenderer` components.

**Highlights**:

- New interactivity, DOM-like event handling / event propagation concept using shadow DOM.
- Event modifiers (Svelte like) for `on:` directives and "prop actions" (svelthree specific).
- Keyboard input handling with flexible `KeyboardEvent` listeners host selection.
- Focus events handling + component / 3d object focusability via `tabindex` prop.
- WAI-ARIA support via `aria` prop.
- Improved reactive (mode `"auto"`) and continuous (mode `"always"`) rendering logic.
- mode `"auto"` is the new default rendering mode. 👉 You may be more comfortable with mode `"always"`, try it out!

Also, various mid and smaller fixes, minor changes, new TS types, comment improvements etc.



## [major-refactor branch](https://github.com/vatro/svelthree/tree/major-refactor)
*tracked after [major-refactor-0.135.0-alpha.2](https://github.com/vatro/svelthree/tree/major-refactor-0.135.0-alpha.2)*

### 🏷 major-refactor-0.135.0-alpha.3

#### Refactored logging system

Optimized for SvelteKit / Vite, depending on `VITE_SVELTHREE_VERBOSE` environment variable (*set in an .env file used as Vite `mode` configuration*) + per component logging configuration (via component attributes):

- No `console.log(...)` entries only `.info`, `.debug`, `.warn` and `.error` (*most of it `.debug`, `.info` only with lifecycle related logs*).
- Better styled console logs.

- Building with `VITE_SVELTHREE_VERBOSE = 1`  will generate a **verbose version**  (e.g. build for **development**).. Logging can be controled per component via following component attributes:

  - `log_all: boolean` logs everything or nothing. This behavior can be further limited or extended by adding:

    - `log_dev: { all?: boolean; prop_utils?: boolean }`
      Configures logging of all development logs (*various stuff*) with the option to turn on / off logging of the `PropUtils` class.

    - `log_rs: boolean`
      Configures logging of all **reactive statement related** logs.

    - `log_lc: { all?: boolean; om?: boolean; bu?: boolean; au?: boolean; od?: boolean } `

      Configures logging of all **lifecycle related** logs: `onMount`, `beforeUpdate`, `afterUpdate`, `onDestroy`. This is used to clearly mark lifecycle events inside the console (*optimized for Chrome-Dev-Tools console*) and should help understanding / debugging lifecycle related logic.

    - `log_mau: boolean`

      **WIP**: Configures logging of all **`matrixAutoUpdate` related** logic. This is currently primarily used for development of a new feature / functionality.

- Building **without** `VITE_SVELTHREE_VERBOSE` (e.g. when running standard `svelte-kit dev` or `svelte-kit build`) or with `VITE_SVELTHREE_VERBOSE = 0`  will strip all logs from code.

  

**Example SveltKit-App configuration** in order this to work as expected:

```javascript
/* svelte.config.js */

import vercel from '@sveltejs/adapter-vercel';
import preprocess from 'svelte-preprocess';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://github.com/sveltejs/svelte-preprocess
	// for more information about preprocessors
	preprocess: preprocess(),

	kit: {
		adapter: vercel(),

		// hydrate the <div id="svelte"> element in src/app.html
		target: '#svelte',
		ssr: process.env.NODE_ENV === 'production',

		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		vite: () => {
			if (process.env.SVELTHREE_VERBOSE) {
				if (process.env.NODE_ENV === 'development') {
					return {
						// see .env.svelthree-dev-verbose
						mode: 'svelthree-dev-verbose'
					}
				} else if (process.env.NODE_ENV === 'production') {
					return {
						// see .env.svelthree-prod-verbose
						mode: 'svelthree-prod-verbose'
					}
				} else {
					// no .env.svelthree-xxx-verbose
					console.error(`ERROR: svelte.config.js: No verbose svelthree-mode defined for process.env.NODE_ENV=${process.env.NODE_ENV}, svelthree will be silent.`)
				}
			} else {
				return {}
			}
		}
	},
	// SvelteKit uses vite-plugin-svelte. Its options can be provided directly here.
	// See the available options at https://github.com/sveltejs/vite-plugin-svelte/blob/main/docs/config.md
	hot: {
		acceptAccessors: true
	}
};

export default config;
```

```text
/* package.json (Windows 10)*/

...
"scripts": {
    ...
    "dev": "svelte-kit dev", //svelthree will be silent (not verbose)
    "build": "svelte-kit build", //svelthree will be silent (not verbose)
    "dev-svelthree-verbose": "set SVELTHREE_VERBOSE=1&& svelte-kit dev", //svelthree will be verbose
    "build-svelthree-verbose": "set SVELTHREE_VERBOSE=1&& svelte-kit build", //svelthree will be verbose
    ...
},
...
```

```text
# file: '.env.svelthree-dev-verbose' in project root
# defines Vite mode: 'svelthree-dev-verbose' -> develop in verbose mode (most probably needed)
NODE_ENV=development
VITE_SVELTHREE_VERBOSE=1
```

```
# file: '.env.svelthree-prod-verbose' in project root
# defines Vite mode: 'svelthree-prod-verbose' -> production build in verbose mode (might be needed for some reason)
NODE_ENV=production
VITE_SVELTHREE_VERBOSE=1
```

#### Miscellaneous

- Added `onMount`, `beforeUpdate` and `afterUpdate` in all components where those were missing / might be needed (in most cases `beforeUpdate` and `afterUpdate`).
- Minor Code refactorings / comment additions / changes etc.



## 0.119.0-5

**✓ SAFE** *None API breaking changes*

- Switch to three.js 119 / svelthree-three 119

  

## 0.118.0-5

**✓ SAFE** *None API breaking changes*

- Refactoring of multiple components fixes [Reactive multiple Mesh creation](https://svelthree.dev/examples#reactive-multiple-mesh-creation) example, but leaves [Issue #1](https://github.com/vatro/svelthree/issues/1) open (help wanted!)



## 0.118.0 - 0.118.0-4

#### 🚀 Initial version 

three.js r118, Svelte 3.24.0

#### Components:

Basic:

- Canvas
- WebGLRenderer
- Scene
- Mesh
- Empty

Cameras:

- PerspectiveCamera
- OrthographicCamera

Lights:

- DirectionalLight
- PointLight

Goodies:

- LoadedGLTF
- OrbitControls