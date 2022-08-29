# svelthree changelog

## 1.0.0-next.0.93

Changes due to check / polish of setting the `target` shorthand attribute on `SpotLight` and `DirectionalLight` components ([#136](https://github.com/vatro/svelthree/issues/136)), including:
- Improved dx / refactored `SvelthreeGLTF.ts` ([#136](https://github.com/vatro/svelthree/issues/136) 2. Task):
  - `GLTF` is now passed via constructor, e.g. `const foo: SvelthreeGLTF = new SvelthreeGLTF(loaded_gltf_file: GLTF)`
  - `apply(...)` now uses a `Canvas` component reference instead of a `Canvas` DOM Element.

Also:
- `WebGLRenderer` now emits interaction events only if canvas is set to be `interactive` (better performance)
- Various TypeScript related changes
- Minor code fixes


## 1.0.0-next.0.92

Resolved ([#141](https://github.com/vatro/svelthree/issues/141)):
  - Renaming of `Object3D` component not necessary (won't fix [#142](https://github.com/vatro/svelthree/issues/142))
	- Won't fix [#144](https://github.com/vatro/svelthree/issues/144))


## 1.0.0-next.0.91

(*most important*) Various changes in order to get `svelte-check found 0 errors, 0 warnings, and 0 hints`, see ([#143](https://github.com/vatro/svelthree/issues/143))

Also:
- Don't re-export `Light` from `three` (unclear why this was done at all)
- `PerspectiveCamera` component's type added to Union Type `TargetableSvelthreeComponent`


## 1.0.0-next.0.89

- (breaking) `Empty` has been replaced with new `Object3D` and `Group` components. ([#132](https://github.com/vatro/svelthree/issues/132))
  - Partially tackling [#136](https://github.com/vatro/svelthree/issues/136) -> refactored `Targetable` type, added new `TargetableSvelthreeComponent` type, see `src\utils\PropUtils.ts`.`setLightTarget(...)` and `src\types-extra.d.ts` etc.


## 1.0.0-next.0.87

- `Scene`: fixed reopened [#131](https://github.com/vatro/svelthree/issues/131) -> update `scene_obj.value` on instance change. 


## 1.0.0-next.0.86

- `Scene`: fixed premade instance injection. ([#131](https://github.com/vatro/svelthree/issues/131))


## 1.0.0-next.0.85

Changes and fixes due to [**Clean up, do TODO, fix TOFIX - #70**](https://github.com/vatro/svelthree/issues/70) **sprint** toward `1.0.0-next.1`

- **Major refactor** of instance creation / recreation / premade instance injection. ([#116](https://github.com/vatro/svelthree/issues/116))

- **Project structure change**: added new modules in order to move more logic out of components (in future) and moved some components' logic into those modules. ([#113](https://github.com/vatro/svelthree/issues/113) / [#116](https://github.com/vatro/svelthree/issues/116))

- **Improved type checking inside `PropUtils.ts`**: using `Array.isArray()`, using three's `.is*` properties, refactored some parts / added new functions in order to avoid redundant checks. ([#115](https://github.com/vatro/svelthree/issues/115))

- All `*Prop` types have been refactored (_simplified_) and moved to `types-comp-props.d.ts` (_not exported by components anymore_) ([#119](https://github.com/vatro/svelthree/issues/119))

- `LoadedGLTF`: added missing `props` / `sProps` logic. ([#120](https://github.com/vatro/svelthree/issues/120))

- `RectAreaLight`: added `width` and `height` shorthand props. ([#122](https://github.com/vatro/svelthree/issues/122))

- Some performance and SvelteKit-SSR related optimizations / fixes.

- Various minor fixes, code optimizations and refactors.


## 1.0.0-next.0.76

Changes and fixes due to [**Clean up, do TODO, fix TOFIX - #70**](https://github.com/vatro/svelthree/issues/70) **sprint**.

### _API_

- **renamed** `WebGLRenderer` **prop** from _old_ `enable_shadowmap` to **new** `shadowmap` ([4f0c751](https://github.com/vatro/svelthree/commit/4f0c7510769b85be6fa7faf2d5b9ca7a8a0b85a5))

- **renamed** `WebGLRenderer` **public method** (_actually for internal use: mode `"auto"` logic_) from _old_ `schedule_render()` to **new** `schedule_render_auto()` ([30f5a51](https://github.com/vatro/svelthree/commit/30f5a5104bc14960131fe916e3ffdecc8fbf7de8))

- **new** `WebGLRenderer` **public method**: `schedule_render()`: might be useful, but also potentially confusing. It's basically a 3rd (_manual_) possibility to schedule a render in mode `auto`, e.g. if a user wants to mix manual and `auto` rendering. Needs to be further tested / used / optimized (_example use cases, pitfalls etc._). ([b4169c5](https://github.com/vatro/svelthree/commit/b4169c53c597ea82140e6c6e430839e384333e76))

### _internal_ ( _most important_ )

-  **Refactored props updating logic**, should improve performance when using the `props` attribute ([c7b86ce](https://github.com/vatro/svelthree/commit/c7b86cea33a420ee6ecdf7e52874b92d8bf36b9f)) ([#102](https://github.com/vatro/svelthree/issues/102), [#77](https://github.com/vatro/svelthree/issues/77)):
	- `Propeller` : `.update(...)` now doesn't check if `prop` object's property is valid, if it is 'own' or 'inherited' or the type of the thee.js instance, all of this is now being done in `SvelthreeProps` on initialization + the information is saved inside `valuators`.
	
	- `SvelthreeProps` : `.update(props)` now returns an array of changed props (keys), so it's possible to use them / insert some extra logic inside component's corresponding reactive functionality where needed. This was done primarily for reactive / conditional updating of cameras' projection matrix.
	
	- `SvelthreeProps` : Nested objects and function property values inside `props` object will now always be updated / reassigned (_on `props` object change_) -> `checkProps` now using Svelte's `safe_not_equal` instead of `not_equal`.
	
- **Refactored / fixed Shadow DOM generation** ([#72](https://github.com/vatro/svelthree/issues/72))

- **Fixed updating of camera's projection matrix** on props change. ([dc5b847](https://github.com/vatro/svelthree/commit/dc5b847a9851ebe8c0f22af96dc38169b0a38d1f))


## 1.0.0-next.0.75

-   ( **!** ) Render mode `auto`: `render_scheduled.status = false` has been **moved to end** of the `render_standard()` function, because `on:before_render` **was scheduling multiple renders in a single AnimationFrame** (_on change_)! Putting `render_scheduled.status = false` to the very start of the `render_standard()` function **was completely wrong**! ([07120b0](https://github.com/vatro/svelthree/commit/07120b002240dd5a62f0db7a2501664dafb64f40))

-   Closed ([#72](https://github.com/vatro/svelthree/issues/72)) -> Now, shadow DOM elements will be added / appended correctly, even for svelthree-components inside non-svelthree 'wrapper' / 'container' components. This is rather a "DUCKTAPE"-fix, because the observed problematic behavior where context was received in wrong order has something to do with Svelte, not svelthree. A **corresponding Svelte issue** has been submitted, see: [**Context value received in wrong order if `bind:this` is set on a slot**](https://github.com/sveltejs/svelte/issues/7606).

-   Silenced Chromium `Event.path` deprecation warning ([4a1b781](https://github.com/vatro/svelthree/commit/4a1b7812e3f67195f2397505b199e19211cd275f))


## 1.0.0-next.0.74

-   Cleaned up / refactored `add_instance_to()` method and other related logic ([#71](https://github.com/vatro/svelthree/issues/71))

-   Removed funding via Patreon -> if you'd like to support me, please use GitHub sponsoring! Thanks! 😁


## 1.0.0-next.0.72

-   Fix `LinkProp` type


## 1.0.0-next.0.71

-   Allow handling clickable components / three.js object instances as `<a>` and `<button>` ([#68](https://github.com/vatro/svelthree/issues/68))
    -   New `button` and `link` props.
    -   New types: `SvelthreeShadowDOMElement`, `ButtonProp`, `LinkProp`.
    -   Slightly changed `aria` prop handling logic:
        -   Always add `ariaLabel` to shadow DOM if specified.
        -   Add `ariaLabel` as `innerText` to shadow DOM `<div>`s only.


## 1.0.0-next.0.70

**Major refactor** incl. new interactivity, event handling / event propagation and accessability concept using shadow DOM. Most (important) changes were made to `SvelthreeInteraction` and `WebGLRenderer` components.

**Highlights**:

-   New interactivity, DOM-like event handling / event propagation concept using shadow DOM.
-   Event modifiers (Svelte like) for `on:` directives and "prop actions" (svelthree specific).
-   Keyboard input handling with flexible `KeyboardEvent` listeners host selection.
-   Focus events handling + component / 3d object focusability via `tabindex` prop.
-   WAI-ARIA support via `aria` prop.
-   Improved reactive (mode `"auto"`) and continuous (mode `"always"`) rendering logic.
-   mode `"auto"` is the new default rendering mode. 👉 You may be more comfortable with mode `"always"`, try it out!

Also, various mid and smaller fixes, minor changes, new TS types, comment improvements etc.


## [major-refactor branch](https://github.com/vatro/svelthree/tree/major-refactor)

_tracked after [major-refactor-0.135.0-alpha.2](https://github.com/vatro/svelthree/tree/major-refactor-0.135.0-alpha.2)_

## 🏷 major-refactor-0.135.0-alpha.3

#### Refactored logging system

Optimized for SvelteKit / Vite, depending on `VITE_SVELTHREE_VERBOSE` environment variable (_set in an .env file used as Vite `mode` configuration_) + per component logging configuration (via component attributes):

-   No `console.log(...)` entries only `.info`, `.debug`, `.warn` and `.error` (_most of it `.debug`, `.info` only with lifecycle related logs_).

-   Better styled console logs.

-   Building with `VITE_SVELTHREE_VERBOSE = 1` will generate a **verbose version** (e.g. build for **development**).. Logging can be controled per component via following component attributes:

    -   `log_all: boolean` logs everything or nothing. This behavior can be further limited or extended by adding:

        -   `log_dev: { all?: boolean; prop_utils?: boolean }`
            Configures logging of all development logs (_various stuff_) with the option to turn on / off logging of the `PropUtils` class.

        -   `log_rs: boolean`
            Configures logging of all **reactive statement related** logs.

        -   `log_lc: { all?: boolean; om?: boolean; bu?: boolean; au?: boolean; od?: boolean } `

            Configures logging of all **lifecycle related** logs: `onMount`, `beforeUpdate`, `afterUpdate`, `onDestroy`. This is used to clearly mark lifecycle events inside the console (_optimized for Chrome-Dev-Tools console_) and should help understanding / debugging lifecycle related logic.

        -   `log_mau: boolean`

            **WIP**: Configures logging of all **`matrixAutoUpdate` related** logic. This is currently primarily used for development of a new feature / functionality.

-   Building **without** `VITE_SVELTHREE_VERBOSE` (e.g. when running standard `svelte-kit dev` or `svelte-kit build`) or with `VITE_SVELTHREE_VERBOSE = 0` will strip all logs from code.

**Example SveltKit-App configuration** in order this to work as expected:

```javascript
/* svelte.config.js */

import vercel from "@sveltejs/adapter-vercel"
import preprocess from "svelte-preprocess"

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://github.com/sveltejs/svelte-preprocess
	// for more information about preprocessors
	preprocess: preprocess(),

	kit: {
		adapter: vercel(),

		// hydrate the <div id="svelte"> element in src/app.html
		target: "#svelte",
		ssr: process.env.NODE_ENV === "production",

		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		vite: () => {
			if (process.env.SVELTHREE_VERBOSE) {
				if (process.env.NODE_ENV === "development") {
					return {
						// see .env.svelthree-dev-verbose
						mode: "svelthree-dev-verbose"
					}
				} else if (process.env.NODE_ENV === "production") {
					return {
						// see .env.svelthree-prod-verbose
						mode: "svelthree-prod-verbose"
					}
				} else {
					// no .env.svelthree-xxx-verbose
					console.error(
						`ERROR: svelte.config.js: No verbose svelthree-mode defined for process.env.NODE_ENV=${process.env.NODE_ENV}, svelthree will be silent.`
					)
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
}

export default config
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

-   Added `onMount`, `beforeUpdate` and `afterUpdate` in all components where those were missing / might be needed (in most cases `beforeUpdate` and `afterUpdate`).
-   Minor Code refactorings / comment additions / changes etc.

## 0.119.0-5

**✓ SAFE** _None API breaking changes_

-   Switch to three.js 119 / svelthree-three 119


## 0.118.0-5

**✓ SAFE** _None API breaking changes_

-   Refactoring of multiple components fixes [Reactive multiple Mesh creation](https://svelthree.dev/examples#reactive-multiple-mesh-creation) example, but leaves [Issue #1](https://github.com/vatro/svelthree/issues/1) open (help wanted!)


## 0.118.0 - 0.118.0-4

#### 🚀 Initial version

three.js r118, Svelte 3.24.0

#### Components:

Basic:

-   Canvas
-   WebGLRenderer
-   Scene
-   Mesh
-   Empty

Cameras:

-   PerspectiveCamera
-   OrthographicCamera

Lights:

-   DirectionalLight
-   PointLight

Goodies:

-   LoadedGLTF
-   OrbitControls
