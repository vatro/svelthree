<!--
`accessors:true` hast to be set per component because of the svelte-language-server bug, otherwise accessors would be falsely detected as missing and highlighted as errors.
svelthree uses svelte-accmod, where accessors are always `true`, regardless of `svelte:options`.  
-->
<svelte:options accessors />

<!--
@component
**svelthree** _Scene_ Component.
[ tbd ]  Link to Docs.
-->
<script context="module" lang="ts">
	/** For typed objects being set as `props` 'shorthand' attribute values, e.g.:
	 * ```
	 * const my_init_props: SceneProps = {...}
	 * component_ref.props = my_init_props
	 * ```
	 * */
	export type SceneProps = OnlyWritableNonFunctionPropsOverwritten<
		Omit<Scene, PropBlackList>,
		{
			position?: Vector3 | Parameters<Vector3["set"]>
			scale?: Vector3 | Parameters<Vector3["set"]>
			rotation?:
				| Euler
				| Parameters<Euler["set"]>
				| Quaternion
				| Parameters<Quaternion["set"]>
				| Vector3
				| Parameters<Vector3["set"]>
			quaternion?: Quaternion | Parameters<Quaternion["set"]>
			matrix?: Matrix4 | Parameters<Matrix4["set"]>

			background?: Texture | Color | string | number | [r: number, g: number, b: number] | number[] | Vector3
		}
	>

	export type SceneInteractionHandler = (e?: CustomEvent) => void
</script>

<script lang="ts">
	import { beforeUpdate, onMount, afterUpdate, onDestroy, getContext, setContext, tick } from "svelte"
	import { get_current_component } from "svelte/internal"
	import { self as _self } from "svelte/internal"
	import { c_rs, c_lc, c_mau, c_dev, verbose_mode, get_comp_name } from "../utils/SvelthreeLogger"
	import type { LogLC, LogDEV } from "../utils/SvelthreeLogger"
	import type { SvelthreeShadowDOMElement } from "../types-extra"

	import type { Euler, Matrix4, Object3D, Quaternion, Vector3 } from "three"

	import { svelthreeStores } from "svelthree/stores"
	import { PropUtils, SvelthreeProps } from "../utils"

	import { SvelthreeAnimation } from "../ani"
	import type { SvelthreeAnimationFunction, SvelthreeAnimationFunctionReturn } from "../types-extra"

	import { SvelthreeInteraction } from "../components-internal"
	import type { RaycastArray } from "../utils/RaycastArray"
	import { createEventDispatcher } from "svelte"
	import type { Writable } from "svelte/store"

	import type { SvelthreeModifiersProp } from "../constants/Interaction"
	import type {
		SvelthreePointerEventHandler,
		SvelthreeFocusEventHandler,
		SvelthreeKeyboardEventHandler,
		SvelthreeWheelEventHandler
	} from "../constants/Interaction"

	import { BoxHelper } from "three"
	import { get_root_scene } from "../utils/SceneUtils"

	import { Scene } from "three"
	import type { FogBase, Color, Mapping, Texture } from "three"
	import { EquirectangularReflectionMapping, TextureLoader } from "three"
	import type { RemoveFirst, OnlyWritableNonFunctionPropsOverwritten, PropBlackList } from "../types-extra"
	import type { ButtonProp, LinkProp } from "../types-comp-props"

	/**
	 *  SVELTEKIT  SSR
	 * `browser` is needed for the SvelteKit setup (SSR / CSR / SPA).
	 * For non-SSR output in RollUp only and Vite only setups (CSR / SPA) we're just mimicing `$app/env` where `browser = true`,
	 * -> TS fix: `$app/env` mapped to `src/$app/env` via svelthree's `tsconfig.json`'s `path` property.
	 * -> RollUp only setup: replace `$app/env` with `../$app/env`
	 * The import below will work out-of-the-box in a SvelteKit setup.
	 */
	import { browser } from "$app/env"

	const self = get_current_component()
	const c_name = get_comp_name(self)

	const shadow_root: Writable<{ element: HTMLDivElement }> = getContext("shadow_root")
	let shadow_root_el: HTMLDivElement
	$: shadow_root_el = $shadow_root.element

	const verbose: boolean = verbose_mode()

	export let log_all: boolean = false
	export let log_dev: { [P in keyof LogDEV]: LogDEV[P] } = log_all ? { all: true } : undefined
	export let log_rs: boolean = log_all
	export let log_lc: { [P in keyof LogLC]: LogLC[P] } = log_all ? { all: true } : undefined
	export let log_mau: boolean = log_all

	const dispatch = createEventDispatcher()

	/** `id` is used to identify / assign a Scene to a 'WebGLRenderer' component.
	 * `id` is **not needed if** a Scene component is a child of any Object3D (e.g. another Scene) in this case
	 * it will be treated as a standard Object3D asset. */
	export let id: string = undefined

	const sti: number = getContext("store_index")

	const svelthreeStore = $svelthreeStores[sti]

	/** [ **feature**: allow providing (_injection_) of (_already created_) threejs object instances ].
	 * `create` is an internal indicator for how the component's corresponding threejs object instance has to be / has been created.
	 * It's being set to `false` on initialization if an (_already created_) threejs object instance was provided,
	 * otherwise it's set to `true`, means a new threejs object instance will be created. */
	let create = false

	/** The (three) instance that was shared to this component as it's 'parent'. */
	let our_parent: Object3D = undefined

	/** Returns the `scene` instance created by the component & allows providing (_injection_) of (_already created / premade_) `THREE.Scene` instances. */
	export let scene: Scene = undefined
	let scene_uuid: string = undefined
	let scene_is_active: boolean = undefined
	let index_in_scenes: number = undefined

	export const is_svelthree_component: boolean = true
	export const is_svelthree_scene: boolean = true

	if (scene) {
		create = false
		on_instance_provided()
	} else {
		create = true
	}

	/** IMPORTANT  Executed when / if an instance was provided **on initializiation** -> only once if at all! */
	function on_instance_provided(): void {
		// check if type of provided instance is correct and then do something with it...
		if (scene.type === "Scene") {
			scene.userData.initScale = scene.scale.x
			scene.userData.svelthreeComponent = self
		} else {
			throw new Error(
				`SVELTHREE > Scene Error: provided 'scene' instance has wrong type '${scene.type}', should be 'Scene'!`
			)
		}
	}

	// Determining 'parent' on initialization if 'scene' instance was provided ('create' is false).
	if (!create) {
		// get the instance that was shared to us as our 'parent'.
		our_parent = getContext("parent") || getContext("scene")

		// share created object (three) instance to all children (slots) as 'parent'.
		setContext("parent", scene)
	}
	// GENERATOR REMARK: 'reactive_re_creation_logic' not implemented for 'Scene'!

	$: if (!scene && create) {
		// handle Scene as normal Object3D if it has a parent

		scene = new Scene()

		scene_uuid = scene.uuid

		scene.userData.initScale = scene.scale.x
		scene.userData.svelthreeComponent = self

		// get the instance that was shared to us as our 'parent'.
		our_parent = getContext("parent") || getContext("scene")

		// share created object (three) instance to all children (slots) as 'parent'.
		setContext("parent", scene)

		if (!our_parent) {
			// 'scene' is a 'root' Scene, direct child of the Canvas component

			// 'scene' is a 'root' Scene, it should have an 'id'.
			if (!id) {
				console.warn(
					"SVELTHREE > Scene : an 'id' prop (not empty String) for Scenes in order to assign them to a 'WebGLRenderer' component!",
					{ id: id }
				)
				throw new Error("SVELTHREE Exception (see warning above)")
			}

			scene.userData.id = id
			scene.userData.sti = sti
			// TODO / TOFIX  // HÄÄÄ??? This is unused / not implemented!!!
			//scene.userData.animations = []

			scene_is_active = false
			scene.userData.isActive = scene_is_active

			svelthreeStore.scenes.push({ scene: scene, id: id, isActive: false })
			index_in_scenes = scene.userData.index_in_scenes
		}

		// every scene spreads it's onw instance to children overwriting the 'root scene' instance
		// so if we need a reference to the topmost 'root scene' from an object inside some nested
		// scene, we have to search for it, see e.g. the `CubeCamera` component
		// TODO / TOFIX  this could cause problems with the `SvelthreeAnimation` component which is checking `currentSceneActive`
		setContext("scene", scene)

		if (verbose && log_dev) console.debug(...c_dev(c_name, `${scene.type} created!`, { scene }))
	}

	// GENERATOR REMARK: 'parent_logic_if_inst_not_provided' excluded for 'Scene'!

	// this statement is being triggered on creation / recreation
	$: if (scene && ((scene_uuid && scene_uuid !== scene.uuid) || scene.parent !== our_parent)) add_instance_to()

	function add_instance_to(): void {
		// if 'scene' was already created or set via 'scene' attribute before
		if (scene_uuid && scene.uuid !== scene_uuid) {
			// remove old instance and update references where needed

			const old_instance: Object3D = scene.getObjectByProperty("uuid", scene_uuid)

			// update 'index_in_x'
			index_in_scenes = old_instance.userData.index_in_scenes

			if (old_instance.userData.helper?.parent) {
				old_instance.userData.helper.parent.remove(old_instance.userData.helper)
				old_instance.userData.helper = null
			}

			if (old_instance.userData.box?.parent) {
				old_instance.userData.helper.parent.remove(old_instance.userData.helper)
				old_instance.userData.box = null
			}

			if (old_instance.parent) old_instance.parent.remove(old_instance)

			scene.userData.id = id
			scene.userData.sti = sti
			// TODO / TOFIX  // HÄÄÄ??? This is unused / not implemented!!!
			//scene.userData.animations = []

			scene.userData.index_in_scenes = index_in_scenes
			$svelthreeStores[sti].scenes[index_in_scenes].scene = scene

			scene.userData.isActive = $svelthreeStores[sti].scenes[index_in_scenes].isActive

			if (scene.userData.isActive) {
				$svelthreeStores[sti].activeScene = scene

				// tells renderer to update the 'current_scene' instance (on-the-fly), see 'WebGLRenderer.renderStandard()'.
				old_instance.userData.renderer_currentscene_needsupdate = true
			}

			// recreate 'SvelthreeProps'
			// - all initially set props will be applied to the new instance.
			// - 'props' attribute can be used directly after scene reassignment.
			sProps = new SvelthreeProps(scene)
		}

		// add `scene` to `our_parent`
		if (our_parent) {
			if (scene.parent !== our_parent) {
				our_parent.add(scene)
				scene_uuid = scene.uuid

				if (verbose && log_dev) {
					console.debug(
						...c_dev(c_name, `${scene.type} was added to ${our_parent.type}!`, {
							scene,
							parent,
							total: scene.children.length
						})
					)
				}
			} else {
				// silently nothing
				//console.warn(`'scene' was already added to (is a child of) ${get_comp_name(our_parent)}`, {scene, our_parent})
			}
		} else {
			// Nothing / no error for Scenes here.
		}
	}

	// accessability -> shadow dom element

	/** Specify the component / three.js object instance to act as an HTML `<button>` element. */
	export let button: ButtonProp = undefined

	/** Specify the component / three.js object instance to act as an HTML `<a>` element. */
	export let link: LinkProp = undefined

	/** Shadow DOM element created by the component, needed for accessability features, event propagation etc. */
	export let shadow_dom_target: SvelthreeShadowDOMElement = undefined

	$: if (shadow_root_el && scene && !shadow_dom_target) create_shadow_dom_target()

	async function create_shadow_dom_target() {
		if (browser) {
			// DUCKTAPE  `getContext()` wrong order fix, see [#72](https://github.com/vatro/svelthree/issues/72)
			await tick()

			if (button) {
				shadow_dom_target = document.createElement("button")

				for (const key in button) {
					shadow_dom_target[key] = button[key]
				}
			} else if (link) {
				shadow_dom_target = document.createElement("a")

				for (const key in link) {
					shadow_dom_target[key] = link[key]
				}
			} else {
				shadow_dom_target = document.createElement("div")
			}

			shadow_dom_target.dataset.kind = "Scene"
			if (name) shadow_dom_target.dataset.name = name

			const parent_shadow_dom_target = our_parent?.userData.svelthreeComponent.shadow_dom_target
			const shadow_target: SvelthreeShadowDOMElement = parent_shadow_dom_target || shadow_root_el

			if (shadow_target) {
				shadow_target.appendChild(shadow_dom_target)
			} else {
				console.error(
					"SVELTHREE > Scene > create_shadow_dom_target > Wasn't able to append shadow DOM element, no 'shadow_target'!",
					{ shadow_target },
					{ parent_shadow_dom_target },
					{ our_parent }
				)
			}
		}
	}

	// accessability -> shadow dom focusable
	export let tabindex: number = undefined

	$: if (shadow_dom_target && tabindex !== undefined) {
		shadow_dom_target.tabIndex = tabindex
	}

	// accessability -> shadow dom wai-aria
	export let aria: Partial<ARIAMixin> = undefined

	$: if (shadow_dom_target && aria !== undefined) {
		for (const key in aria) {
			if (key === "ariaLabel") {
				// add specified `ariaLabel` as text to shadow DOM `<div>` element ONLY (for better reader support / indexing (?))
				if (!link && !button) {
					//  TODO  RECONSIDER  needs to be tested more, may be obsolete (?).
					shadow_dom_target.innerText += `${aria[key]}`
				}
			}

			shadow_dom_target[key] = aria[key]
		}
	}

	/** Set `Scene`'s `.matrixAutoUpdate` which will also be set for all objects (*components*) in the scene (*default is `true`*).
	 * You can override `Scene`'s `.matrixAutoUpdate` per component by setting their own `mau` shorthand attribute to `true` or `false`.
	 * Also: `mau` can be changed on-the-fly. */
	export let mau: boolean = undefined

	// IMPORTANT  +  COOL!  SVELTE  this runs only on 'mau' change!
	$: if (mau !== undefined) {
		mau === true ? enableSceneAuto() : disableSceneAuto()
	}

	function enableSceneAuto() {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "mau > enableSceneAuto!", { mau }))

		// IMPORTANT  lets the renderer perform scene.updateMatrixWorld() on every render pass.
		scene.autoUpdate = true

		// IMPORTANT  `scene.updateMatrixWorld()` will always call `matrixUpdate()` first which will set `scene.matrixWorldNeedsUpdate` to `true`.
		scene.matrixAutoUpdate = true

		if (verbose && log_mau) console.debug(...c_mau(c_name, "enableSceneAuto! scene.autoUpdate:", scene.autoUpdate))
		if (verbose && log_mau)
			console.debug(...c_mau(c_name, "enableSceneAuto! scene.matrixAutoUpdate:", scene.matrixAutoUpdate))
	}

	function disableSceneAuto() {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "mau > disableSceneAuto!", { mau }))

		// IMPORTANT  lets the renderer perform scene.updateMatrixWorld() on every render pass -> we don't have to do it in the component!.
		scene.autoUpdate = true

		// IMPORTANT  prevents calling `matrixUpdate()` on `scene.updateMatrixWorld()`
		// -> won't set `scene.matrixWorldNeedsUpdate = true`...
		// -> won't set `force = true`, preventing forced `updateMatrixWorld()` of all scene children in case the scene matrix hasn't changed.
		// -> https://github.com/mrdoob/three.js/blob/6a51509d8aeac60ac3fe0f6766a15f5342d6e643/src/core/Object3D.js#L565-L605
		scene.matrixAutoUpdate = false

		if (verbose && log_mau) console.debug(...c_mau(c_name, "disableSceneAuto! scene.autoUpdate:", scene.autoUpdate))
		if (verbose && log_mau)
			console.debug(...c_mau(c_name, "disableSceneAuto! scene.matrixAutoUpdate:", scene.matrixAutoUpdate))
	}

	export let name: string = undefined
	$: if (scene && name) scene.name = name

	/** ☝️ `matrix` **shorthand** attribute overrides ( *are ignored* ) `pos`, `rot`, `quat`, `scale` and `lookAt` 'shorthand' attributes! */
	export let matrix: Matrix4 | Parameters<Matrix4["set"]> = undefined

	const w_sh = PropUtils.getShortHandAttrWarnings(`SVELTHREE > ${c_name} >`)

	let sProps: SvelthreeProps

	// IMPORTANT  `props` will be overridden by 'shorthand' attributes!
	/** **shorthand** attribute for setting properties using key-value pairs in an `Object`. */
	export let props: { [P in keyof SceneProps]: SceneProps[P] } = undefined

	$: if (!sProps && scene && props) sProps = new SvelthreeProps(scene)
	$: if (props && sProps) update_props()
	function update_props() {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "props", props))
		sProps.update(props)
	}

	// IMPORTANT  following 'shorthand' attributes will override `props` attribute!

	/** **shorthand** attribute for setting the `position` property. */
	export let pos: Vector3 | Parameters<Vector3["set"]> = undefined
	$: !matrix && scene && pos ? set_pos() : pos && scene ? console.warn(w_sh.pos) : null
	function set_pos() {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "pos", pos))
		PropUtils.setPositionFromValue(scene, pos)
	}

	/** **shorthand** attribute for setting the `rotation` property. */
	export let rot:
		| Euler
		| Parameters<Euler["set"]>
		| Quaternion
		| Parameters<Quaternion["set"]>
		| Vector3
		| Parameters<Vector3["set"]> = undefined
	$: !matrix && !quat && scene && rot ? set_rot() : rot && scene ? console.warn(w_sh.rot) : null
	function set_rot() {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "rot", rot))
		PropUtils.setRotationFromValue(scene, rot)
	}

	/** **shorthand** attribute for setting the `quaternion` property. */
	export let quat: Quaternion | Parameters<Quaternion["set"]> = undefined
	$: !matrix && scene && quat ? set_quat() : quat && scene ? console.warn(w_sh.quat) : null
	function set_quat() {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "quat", quat))
		PropUtils.setQuaternionFromValue(scene, quat)
	}

	export let scale: Vector3 | Parameters<Vector3["set"]> = undefined
	$: !matrix && scene && scale ? set_scale() : scale && scene ? console.warn(w_sh.scale) : null
	function set_scale() {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "scale", scale))
		PropUtils.setScaleFromValue(scene, scale)
	}

	/** */
	export let lookAt: Vector3 | Parameters<Vector3["set"]> | Object3D = undefined
	$: !matrix && scene && lookAt ? set_lookat() : lookAt && scene ? console.warn(w_sh.lookAt) : null
	function set_lookat() {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "lookAt", lookAt))
		PropUtils.setLookAtFromValue(scene, lookAt)
	}

	// IMPORTANT  `matrix` 'shorthand' attribute will override all other transforms ('shorthand' attributes)!
	$: if (matrix && scene) set_matrix()
	function set_matrix(): void {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "matrix", matrix))
		PropUtils.setMatrixFromValue(scene, matrix)
	}

	export let castShadow: boolean = undefined
	$: if (castShadow !== undefined && scene) scene.castShadow = castShadow

	export let receiveShadow: boolean = undefined
	$: if (receiveShadow !== undefined && scene) scene.receiveShadow = receiveShadow

	/** Scene `.background`. */
	export let bg: Texture | Color | string | number | [r: number, g: number, b: number] | number[] | Vector3 =
		undefined
	$: if (bg) set_bg()

	function set_bg(): void {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "bg", bg))

		if (bg.constructor?.name === "Texture") {
			scene.background = bg as Texture
		} else {
			PropUtils.setColorFromValueKey(scene, bg, "background")
		}
	}

	/** Scene background texture image (*url/path*) and mapping method.
	 * Loads the texture image, creates a texture and sets it as Scene `.background`.*/
	export let bg_tex: { url: string; mapping?: Mapping } = undefined
	$: if (bg_tex) set_bg_tex()

	function set_bg_tex(): Texture {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "bg_tex", bg_tex))

		//  SVELTEKIT  SSR
		if (browser) {
			const env_texture_loader = new TextureLoader().load(bg_tex.url, (tex) => {
				if (bg_tex.mapping) tex.mapping = bg_tex.mapping
				scene.background = tex
			})

			return env_texture_loader
		}
	}

	/** Scene `.fog`. */
	export let fog: FogBase = undefined
	$: if (fog) set_fog()

	function set_fog(): void {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "fog", bg))
		scene.fog = fog
	}

	/** Scene `.environment` texture. */
	export let env: Texture = undefined
	$: if (env) set_env()

	function set_env(): void {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "env", env))
		scene.environment = env
	}

	/** Scene environment texture image (*url/path*) and mapping method (*optional, default: `EquirectangularReflectionMapping`*).
	 * Loads the texture image, creates a texture and sets it as Scene `.environment`. */
	export let env_tex: { url: string; mapping?: Mapping } = undefined
	$: if (env_tex) set_env_tex()

	function set_env_tex(): Texture {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "env_tex", env_tex))

		//  SVELTEKIT  SSR
		if (browser) {
			const env_texture_loader = new TextureLoader().load(env_tex.url, (tex) => {
				tex.mapping = env_tex.mapping | EquirectangularReflectionMapping
				scene.environment = tex
			})

			return env_texture_loader
		}
	}

	/** The root scene -> `scene.parent = null`. */
	let root_scene: Scene | null = undefined
	$: if (root_scene === undefined) {
		root_scene = get_root_scene(getContext("scene"))

		if (root_scene === scene) {
			// we are the root scene
			root_scene = null
		} else {
			scene.userData.root_scene = root_scene
		}
	}

	type BoxHelperParams = ConstructorParameters<typeof BoxHelper>
	export let boxParams: RemoveFirst<BoxHelperParams> = undefined
	/** Creates and adds a `BoxHelper`. */
	export let box: boolean = undefined

	/** Removes `WebGLRenderer` `"update_helpers"` event listener. */
	let remove_update_box_on_render_event: () => void = undefined

	$: if (box && scene && root_scene && !scene.userData.box) add_box_helper()
	$: if (!box && scene.userData.box) remove_box_helper()

	function add_box_helper() {
		if (boxParams) {
			scene.userData.box = new BoxHelper(scene, ...boxParams)
		} else {
			scene.userData.box = new BoxHelper(scene)
		}

		scene.userData.box.visible = false
	}

	// update and show box on next frame
	$: if (box && scene && scene.userData.box && $svelthreeStores[sti].rendererComponent && root_scene) {
		apply_box()
	}

	function apply_box(): void {
		if (!scene.userData.box.parent) {
			// add all boxes to the root scene!
			root_scene.add(scene.userData.box)
		}

		// update box and make it visible
		scene.userData.box.update()
		scene.userData.box.visible = true

		// start updating
		if (!remove_update_box_on_render_event) {
			remove_update_box_on_render_event = $svelthreeStores[sti].rendererComponent.$on(
				"update_helpers",
				update_box
			)
		}
	}

	function update_box(): void {
		scene.userData.box.update()
	}

	function remove_box_helper(): void {
		if (remove_update_box_on_render_event) {
			remove_update_box_on_render_event()
			remove_update_box_on_render_event = null
		}

		if (scene.userData.box?.parent) {
			scene.userData.box.parent.remove(scene.userData.box)
			scene.userData.box = null
		}
	}

	/** Make component's three.js object interactive -> enable raycasting, `on:<event_name>` directives and `on_<event_name>` internal actions. */
	export let interact: boolean = undefined

	/** Adds component's three.js object instance to the `raycast` array even if it's not set to `interact` ( _no interaction listeners_ ).
	 * This way the object acts as a pure _interaction occluder / blocker_ -> will be detected / intersected by `Raycaster`'s ray.
	 *
	 * Setting the `block` prop makes sense only if the `interact` prop is not set / set to `false`.
	 * In case `interact` prop is set / set to `true`, but no e.g. `on:<event_name>` directives or `on_<event_name>` internal actions are set,
	 * the object will automatically become an _interaction occluder / blocker_.
	 */
	export let block: boolean = false

	let interactive: boolean = undefined
	const canvas_interactivity: Writable<{ enabled: boolean }> = getContext("canvas_interactivity")

	$: interactive = $canvas_interactivity.enabled

	let interactionEnabled: boolean = undefined
	$: interactionEnabled = interactive && interact

	//  IMPORTANT  not reactive
	const raycast: RaycastArray = getContext("raycast")

	// reactively enable raycasting to the created three.js instance
	$: if (interactionEnabled && raycast && !block) {
		if (!raycast.includes(scene)) {
			scene.userData.block = false
			raycast.push(scene)
		} else {
			scene.userData.block = false
		}
	}

	// reactively enable raycasting to the created three.js instance if it's an 'interaction occluder / blocker'
	$: if (!interactionEnabled && raycast && block) {
		if (!raycast.includes(scene)) {
			scene.userData.block = true
			raycast.push(scene)
		} else {
			scene.userData.block = true
		}
	}

	// reactively disable raycasting to the created three.js instance
	$: if (!interactionEnabled && raycast && !block) {
		if (raycast.includes(scene)) {
			raycast.splice(scene.userData.index_in_raycast, 1)
			scene.userData.block = false
		}
	}

	/** `SvelthreeInteraction` component reference used for reactive listener management only. */
	let interaction_comp = undefined

	/**
	 * **svelthree** replacement for [`$on`](https://svelte.dev/docs#run-time-client-side-component-api-$on), does basically the same,
	 * but it doesn't return a function for removal of the listener (_like Svelte native does_), instead use `.onx(type, callback)` syntax.
	 * Needed for **reactive** interaction listener management -> _internal svelthree functionality_.
	 *
	 * ☝️ _Can be used with **interactive components only** -> `interact` prop has to be `true`._
	 */
	export async function on(type: any, callback: any): Promise<void> {
		if (interact) {
			if (!interaction_comp || !shadow_dom_target) await tick()

			self.$on(type, callback)
			interaction_comp.update_listeners = true
		} else {
			console.error(
				"SVELTHREE > Mesh > on : You can call the '.on(...)' function with interactive components only! Component's 'interact' prop has to be 'true'."
			)
		}
	}

	/**
	 * **svelthree** replacement for the _event listener removal function_ returned by [`$on`](https://svelte.dev/docs#run-time-client-side-component-api-$on), does basically the same,
	 * needed for **reactive** interaction listener management -> _internal svelthree functionality_. It additionaly allows programmatic removal of all callbacks of a certain type and
	 * programmatic removal of 'forwarding' directives (no handlers) like `on:click`.
	 *
	 * ☝️ _Can be used with **interactive components only** -> `interact` prop has to be `true`._
	 */
	export async function onx(type: any, callback: any): Promise<void> {
		if (interact) {
			if (!interaction_comp || !shadow_dom_target) await tick()

			const cbacks = self.$$.callbacks[type]
			if (callback) {
				const index = cbacks.indexOf(callback)
				if (index !== -1) cbacks.splice(index, 1)
			} else {
				// allows e.g. onx("click") -> will remove all callbacks and the callback type itself
				// this way we can also programatically delete 'forwarding' directives (no handlers) like `on:click`
				self.$$.callbacks[type].length = 0
				delete self.$$.callbacks[type]
			}

			interaction_comp.update_listeners = true
		} else {
			console.error(
				"SVELTHREE > Mesh > onx : You can call the '.onx(...)' function with interactive components only! Component's 'interact' prop has to be 'true'!"
			)
		}
	}

	/** Interaction modifiers. */
	export let modifiers: SvelthreeModifiersProp = undefined

	export let on_click: SvelthreePointerEventHandler = undefined
	$: if (on_click !== undefined && interaction_comp && shadow_dom_target) {
		interaction_comp.update_listeners = true
	}

	export let on_pointerup: SvelthreePointerEventHandler = undefined
	$: if (on_pointerup !== undefined && interaction_comp && shadow_dom_target) {
		interaction_comp.update_listeners = true
	}

	export let on_pointerdown: SvelthreePointerEventHandler = undefined
	$: if (on_pointerdown !== undefined && interaction_comp && shadow_dom_target) {
		interaction_comp.update_listeners = true
	}

	export let on_pointerover: SvelthreePointerEventHandler = undefined
	$: if (on_pointerover !== undefined && interaction_comp && shadow_dom_target) {
		interaction_comp.update_listeners = true
	}

	export let on_pointerout: SvelthreePointerEventHandler = undefined
	$: if (on_pointerout !== undefined && interaction_comp && shadow_dom_target) {
		interaction_comp.update_listeners = true
	}

	export let on_pointermove: SvelthreePointerEventHandler = undefined
	$: if (on_pointermove !== undefined && interaction_comp && shadow_dom_target) {
		interaction_comp.update_listeners = true
	}

	export let on_pointermoveover: SvelthreePointerEventHandler = undefined
	$: if (on_pointermoveover !== undefined && interaction_comp && shadow_dom_target) {
		interaction_comp.update_listeners = true
	}

	export let on_keydown: SvelthreeKeyboardEventHandler = undefined
	$: if (on_keydown !== undefined && interaction_comp && shadow_dom_target) {
		interaction_comp.update_listeners = true
	}

	export let on_keypress: SvelthreeKeyboardEventHandler = undefined
	$: if (on_keypress !== undefined && interaction_comp && shadow_dom_target) {
		interaction_comp.update_listeners = true
	}

	export let on_keyup: SvelthreeKeyboardEventHandler = undefined
	$: if (on_keyup !== undefined && interaction_comp && shadow_dom_target) {
		interaction_comp.update_listeners = true
	}

	export let on_focus: SvelthreeFocusEventHandler = undefined
	$: if (on_focus !== undefined && interaction_comp && shadow_dom_target) {
		interaction_comp.update_listeners = true
	}

	export let on_blur: SvelthreeFocusEventHandler = undefined
	$: if (on_blur !== undefined && interaction_comp && shadow_dom_target) {
		interaction_comp.update_listeners = true
	}

	export let on_focusin: SvelthreeFocusEventHandler = undefined
	$: if (on_focusin !== undefined && interaction_comp && shadow_dom_target) {
		interaction_comp.update_listeners = true
	}

	export let on_focusout: SvelthreeFocusEventHandler = undefined
	$: if (on_focusout !== undefined && interaction_comp && shadow_dom_target) {
		interaction_comp.update_listeners = true
	}

	export let on_wheel: SvelthreeWheelEventHandler = undefined // ->  TODO  implement
	$: if (on_wheel !== undefined && interaction_comp && shadow_dom_target) {
		interaction_comp.update_listeners = true
	}

	export let on_wheelover: SvelthreeWheelEventHandler = undefined // -> TODO  implement
	$: if (on_wheelover !== undefined && interaction_comp && shadow_dom_target) {
		interaction_comp.update_listeners = true
	}

	/** Animation logic to be performed with the (three) object instance created by the component. */
	export let animation: SvelthreeAnimationFunction = undefined

	let animationEnabled: boolean = false
	$: if (animation) animationEnabled = true

	/** Immediately start provided animation, default: `false`. Alternative: `<component_reference>.start_animation()` or shorter `.start_ani()`. */
	export let aniauto: boolean = undefined

	let ani: SvelthreeAnimation
	$: if (animation && animationEnabled) ani = new SvelthreeAnimation(scene, scene, animation, aniauto)

	let currentSceneActive = undefined
	$: currentSceneActive = $svelthreeStores[sti].scenes[scene.userData.index_in_scenes]?.isActive
	$: if (ani && currentSceneActive !== undefined) ani.onCurrentSceneActiveChange(currentSceneActive)

	/** Removes the (three) instance of the object created by the component from it's parent. */
	export const remove_instance_from_parent = (): void => {
		if (scene.parent) scene.parent.remove(scene)
	}
	/**
	 * Same as `remove_instance_from_parent()` just shorter syntax.
	 * Removes the (three) instance of the object created by the component from it's parent.
	 */
	export const remove = remove_instance_from_parent

	/** Returns the (three) instance of the object created by the component. */
	export const get_instance = (): Scene => scene

	/** Returns the `animation` object. */
	export const get_animation = (): any => ani.getAnimation()
	/** Same as `get_animation()` just shorter syntax. Returns the `animation` object. */
	export const get_ani = get_animation

	/** Starts the `animation` object. */
	export const start_animation = (): void => ani.startAni()
	/** Same as `start_animation()` just shorter syntax. Starts the `animation` object. */
	export const start_ani = start_animation

	/** Sets `focus()` on the component / it's shadow dom element. */
	export const focused = (): void => shadow_dom_target.focus()

	/** **Completely replace** `onMount` -> any `onMount_inject_before` & `onMount_inject_after` will be ignored.
	 * _default verbosity will be gone!_ */
	export let onMount_replace: (args?: any) => any = undefined

	onMount(
		onMount_replace
			? async () => onMount_replace(_self)
			: async () => {
					if (verbose && log_lc && (log_lc.all || log_lc.om)) {
						console.info(...c_lc(c_name, "onMount"))
					}

					if (verbose && log_mau) {
						console.debug(
							...c_mau(c_name, "onMount : scene.", {
								matrixAutoUpdate: scene.matrixAutoUpdate,
								matrixWorldNeedsUpdate: scene.matrixWorldNeedsUpdate
							})
						)
					}
			  }
	)

	/** **Inject** functionality **before** component's existing `onDestroy` logic.
	 * _default verbosity not affected._ */
	export let onDestroy_inject_before: (args?: any) => any = undefined

	/** **Inject** functionality **after** component's existing `onDestroy` logic.
	 * _default verbosity not affected._ */
	export let onDestroy_inject_after: (args?: any) => any = undefined

	/** **Completely replace** `onDestroy` -> any `onDestroy_inject_before` & `onDestroy_inject_after` will be ignored.
	 * _default verbosity will be gone!_ */
	export let onDestroy_replace: (args?: any) => any = undefined

	onDestroy(
		onDestroy_replace
			? async () => onDestroy_replace(_self)
			: async () => {
					if (verbose && log_lc && (log_lc.all || log_lc.od)) {
						console.info(...c_lc(c_name, "onDestroy"))
					}

					if (verbose && log_mau) {
						console.debug(
							...c_mau(c_name, "onDestroy : scene.", {
								matrixAutoUpdate: scene.matrixAutoUpdate,
								matrixWorldNeedsUpdate: scene.matrixWorldNeedsUpdate
							})
						)
					}

					if (onDestroy_inject_before) onDestroy_inject_before()

					remove_box_helper()
					if (ani) ani.destroyAnimation()

					if (onDestroy_inject_after) onDestroy_inject_after()
			  }
	)

	/** **Completely replace** `beforeUpdate` -> any `beforeUpdate_inject_before` & `beforeUpdate_inject_after` will be ignored.
	 * _default verbosity will be gone!_ */
	export let beforeUpdate_replace: (args?: any) => any = undefined

	beforeUpdate(
		beforeUpdate_replace
			? async () => beforeUpdate_replace(_self)
			: async () => {
					if (verbose && log_lc && (log_lc.all || log_lc.bu)) {
						console.info(...c_lc(c_name, "beforeUpdate"))
					}

					if (verbose && log_mau) {
						console.debug(
							...c_mau(c_name, "beforeUpdate : scene.", {
								matrixAutoUpdate: scene.matrixAutoUpdate,
								matrixWorldNeedsUpdate: scene.matrixWorldNeedsUpdate
							})
						)
					}
			  }
	)

	/** **Inject** functionality **before** component's existing `afterUpdate` logic.
	 * _default verbosity not affected._ */
	export let afterUpdate_inject_before: (args?: any) => any = undefined

	/** **Inject** functionality **after** component's existing `afterUpdate` logic.
	 * _default verbosity not affected._ */
	export let afterUpdate_inject_after: (args?: any) => any = undefined

	/** **Completely replace** `afterUpdate` -> any `afterUpdate_inject_before` & `afterUpdate_inject_after` will be ignored.
	 * _default verbosity will be gone!_ */
	export let afterUpdate_replace: (args?: any) => any = undefined

	afterUpdate(
		afterUpdate_replace
			? async () => afterUpdate_replace(_self)
			: async () => {
					if (verbose && log_lc && (log_lc.all || log_lc.au)) {
						console.info(...c_lc(c_name, "afterUpdate"))
					}

					if (verbose && log_mau) {
						console.debug(
							...c_mau(c_name, "afterUpdate : scene.", {
								matrixAutoUpdate: scene.matrixAutoUpdate,
								matrixWorldNeedsUpdate: scene.matrixWorldNeedsUpdate
							})
						)
					}

					if (afterUpdate_inject_before) afterUpdate_inject_before()

					// Update local matrix after all (props) changes (async microtasks) have been applied.
					if (!scene.matrixAutoUpdate) scene.updateMatrix()

					if (verbose && !scene.matrixAutoUpdate && log_mau) {
						console.debug(
							...c_mau(c_name, "afterUpdate : scene.", {
								matrixAutoUpdate: scene.matrixAutoUpdate,
								matrixWorldNeedsUpdate: scene.matrixWorldNeedsUpdate
							})
						)
					}

					if ($svelthreeStores[sti].rendererComponent?.mode === "auto") {
						if (root_scene) {
							root_scene.userData.dirty = true
							$svelthreeStores[sti].rendererComponent.schedule_render_auto(root_scene)
						} else {
							// we are the root scene
							scene.userData.dirty = true
							$svelthreeStores[sti].rendererComponent.schedule_render_auto(scene)
						}
					}

					if (afterUpdate_inject_after) afterUpdate_inject_after()
			  }
	)
</script>

<slot />

{#if $svelthreeStores[sti].renderer && $svelthreeStores[sti].renderer.xr.enabled === false && interact}
	<SvelthreeInteraction
		bind:this={interaction_comp}
		{shadow_dom_target}
		{modifiers}
		{dispatch}
		obj={scene}
		parent={self}
		{interactionEnabled}
		{log_dev}
		{log_lc}
	/>
{/if}
