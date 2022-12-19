# svelthree changelog

## 1.0.0-next.0.98

Switched to `default-svelte-first` approach. see [#196](https://github.com/vatro/svelthree/issues/196)

For the sake of general `svelthree`-acceptance, faster development and last but not least: performance, [`svelte-accmod`](https://github.com/vatro/svelte-accmod)-first approach has been dropped for the upcoming `svelthree-1.0.0-next.1` release. `accessors` usage will not be recommended for various reasons which are yet to be nailed down in more detail (_basically the reasons why I created `svelte-accmod` in the first place_).

**Most important changes:**
- `svelthree`-package now contains **two component-versions**:
  - one without any `<svelte:options />` element (**_accessors disabled_**): **default** `import { Foo } from "svelthree"`
  - and one with `<svelte:options accessors />` element (**_accessors enabled_**): `import { Foo } from "svelthree/acc"` which will import **correctly / better typed** components.
- the code has been **refactored not to use accessors-syntax** and is now using `$set` and the new component-method `state()` (_see below_) instead.
- **new component method `state()`** has been introduced as an **alternative to accessor-getters**. It's available on initialization and is being used internally to access components' props (state) during initialization (before mounting). It's also the standard `svelthree`-method for getting component's props without using accessors, basically something like the `dev`-only method `.$capture_state()`, but with `.state()`:

  - the returned Object (_state_) contains **only exported props**
  - the returned Object (_state_) **is typed** (`interface IState*`)

   _Remark:_ the `IState*` interfaces are being automatically generated for generated components. `Canvas` and `WebGLRenderer` interfaces need to be updated manually (atm).

- **Changes due to `SvelteKit 1` and `sveltejs/package 1` releases:**

  see https://kit.svelte.dev/docs/packaging
  - All relative file imports are now fully specified, adhering to Node's ESM algorithm
  - Now using `import.meta.env.SSR` to make the library available to all Vite-based projects
  - Changed comment / wording `SVELTEKIT SSR` to `SVELTEKIT CSR ONLY`
  - Removed `$app\environment`
  - Removed "svelthree/stores" alias from kit-config (_now using relative path_)

**Various changes:**
- Further optimized `Material` related types, also introducing new types `MeshMaterialWithColor` and `MeshMaterialWithEnvMap`.
- `CubeCamera` is now using the new `MeshMaterialWithEnvMap`
- More types are being exported and can now be imported via `import type { Foo } from "svelthree"`
- Some type- and comment-fixes

**Updated dependencies:**
  - "@sveltejs/kit": "^1.0.1"
  - "@sveltejs/package": "^1.0.1"
  - "svelte": "^3.54.0" analog current `create-svelte` entry
    _though it could also be `^3.44.0`, but I'll stick to `create-svelte` since `svelthree`-starters will be based on it_
  - "three": "0.125.x - 0.147.x"
  - "@types/three": "0.125.x - 0.147.x" (_although currently no 0.147.x_)
  - the rest of `devDependencies` to latest versions


## 1.0.0-next.0.97

[_**major refactor**_] Refactored everything in `strict` mode, see pull-request [#185](https://github.com/vatro/svelthree/pull/185) and issue [#153](https://github.com/vatro/svelthree/issues/153). We're a **strictly typed** Svelte components library now! 🥳

Also: various improvements and fixes.


## 1.0.0-next.0.96

- Resolved all ESLint errors and warnings see pull-requests [#169](https://github.com/vatro/svelthree/pull/169) and [#179](https://github.com/vatro/svelthree/pull/179), except one warning which is yet to be fixed by [#135](https://github.com/vatro/svelthree/issues/135).
- Refactored additional (`svelthree`-specific) lifecycle logic, see pull-request [#181](https://github.com/vatro/svelthree/pull/181).
- Rendering multiple inputs / outputs example / test-scene (_not public_) works again ([#159](https://github.com/vatro/svelthree/issues/159)). See pull-request [#184](https://github.com/vatro/svelthree/pull/184)
- Updated peer dependency `svelte-accmod-patch` to `^1.0.2`


## 1.0.0-next.0.95

[_**major refactor**_] Changed project structure / setup using `npm create svelte@latest` + library option as a starting point, including custom post-processing of the generated package (TypeScript / DX related). So far so good, tested. 🚀 ([#161](https://github.com/vatro/svelthree/issues/161))

Most important TypeScript related changes:
- (_internal_) All functions (_sync/async_) exposed (_accessors_) via `export function foo(...)` have been rewritten to:

  `export const foo = () => {...}` or `export const foo = async () => {...}` ([see #161 comment](https://github.com/vatro/svelthree/issues/161#issuecomment-1238319446)).

- (_internal_) Different handling of generic / assigned Material in `Mesh` and `Points` components (_new types + post-processing of generated `*.d.ts` files_)

- (_internal_) Don't import `Foo` from 'three' into component `Foo`, import `Foo as THREE_Foo` from 'three' instead ([see #161 comment](https://github.com/vatro/svelthree/issues/161#issuecomment-1238319446)). _REMARK: currently `Scene` and `Object3D` three.js classes and types are always imported `as THREE_Foo`, but this is actually not always neccessary -> may change before `1.0.0-next.1`_)

- (_currently internal_) Types `<component name>Props` changed to `<component name>Properties` due to conflict in generated `d.ts` ([see #161 comment](https://github.com/vatro/svelthree/issues/161#issuecomment-1238319446)). This is currently an internal change, but will be relevant in next version (_Property-Types will be exported_), also those types may be renamed again.

Also: several JSDoc changes etc.

**REMARK (NEXT)**: Atm there are a lot of ESLint errors and warnings which need to be fixed (_TODO: next version_).


## 1.0.0-next.0.94

- `Canvas`: 
	- reset or trim `svelthreeStores` array on destruction ([#155](https://github.com/vatro/svelthree/issues/155))
	- move slot to shadow DOM `<div />` ([#158](https://github.com/vatro/svelthree/issues/158))
	- update `interactive` in `svelthreeStores` ([#157](https://github.com/vatro/svelthree/issues/157))

- Add components' shadow DOM element getters ([#156](https://github.com/vatro/svelthree/issues/156))
- Refactor due to ([#100](https://github.com/vatro/svelthree/issues/100)):
	- Add ability to iterate over manually user-created / svelthree-generated children and `$destroy()` them
	- Refactor `SvelthreeGLTF.ts` accordingly (see `**` below)
- Sveral `types-extra.d.ts` changes / checks (incl. [#154](https://github.com/vatro/svelthree/issues/154))
- Add hint to `threlte` in `README.md` file.

`**` Due to onging project setup issues, especially conerning TypeScript, I've decided to migrate to new `SvelteKit`-library project setup ([#161](https://github.com/vatro/svelthree/issues/161)), which will allow me to massively increase code quality and development speed in future. All possible issues related to recently made changes (_see above_) will be targeted in next versions after the project setup change.


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
