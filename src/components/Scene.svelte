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
	import { beforeUpdate, onMount, afterUpdate, onDestroy, getContext, setContext } from "svelte"
	import { get_current_component } from "svelte/internal"
	import { self as _self } from "svelte/internal"
	import { c_rs, c_lc, c_mau, c_dev, verbose_mode, get_comp_name } from "../utils/SvelthreeLogger"
	import type { LogLC, LogDEV } from "../utils/SvelthreeLogger"
	import type { Euler, Matrix4, Object3D, Quaternion, Vector3 } from "three"

	import { svelthreeStores } from "../stores"
	import { PropUtils, SvelthreeProps } from "../utils"

	import { SvelthreeAnimation } from "../components-internal"
	import type { SvelthreeAnimationFunction, SvelthreeAnimationFunctionReturn } from "../types-extra"

	import { SvelthreeInteraction } from "../components-internal"
	import { createEventDispatcher } from "svelte"
	import type { Writable } from "svelte/store"

	import { BoxHelper } from "three"

	import { Scene } from "three"
	import type { FogBase, Color, Mapping, Texture } from "three"
	import { EquirectangularReflectionMapping, TextureLoader } from "three"
	import type { RemoveFirst, OnlyWritableNonFunctionPropsOverwritten, PropBlackList } from "../types-extra"

	const self = get_current_component()
	const c_name = get_comp_name(self)

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
	$: if (
		scene &&
		((scene_uuid && scene_uuid !== scene.uuid) || (scene.parent !== our_parent && scene !== our_parent))
	)
		add_instance_to()

	function add_instance_to(): void {
		//let replacing = false

		// if 'scene' was already created or set via 'scene' attribute before
		if (scene_uuid && scene.uuid !== scene_uuid) {
			// remove old instance and update references where needed

			const old_instance: Object3D = scene.getObjectByProperty("uuid", scene_uuid)

			// update 'index_in_x'

			/*
if ($svelthreeStores[sti].scenes.indexOf(old_instance) !== index_in_scenes) {
	index_in_scenes = $svelthreeStores[sti].scenes.indexOf(old_instance)
}
*/

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

				// tells renderer to update the 'currentScene' instance (on-the-fly), see 'WebGLRenderer.renderStandard()'.
				old_instance.userData.renderer_currentscene_needsupdate = true
			}

			// recreate 'SvelthreeProps'
			// - all initially set props will be applied to the new instance.
			// - 'props' attribute can be used directly after scene reassignment.
			sProps = new SvelthreeProps(scene)

			// helpers will be recreated automatically
			// (see corresponding reactive statement -> !scene.userData.helper)
		}

		// add `scene` to `our_parent`
		if (our_parent) {
			// TODO  UNDERSTAND completely why we need the `scene !== our_parent` check (was added as quick-fix)
			// TODO  Update - we changed the approach, still needed?
			if (scene.parent !== our_parent && scene !== our_parent) {
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
				// TODO / TOFIX  why is this happening if `!replacing`?
				//if (!replacing) console.warn(`scene was already added to the ${get_comp_name(our_parent)}`, {scene, our_parent})
			}
		} else {
			// Nothing / no error for Scenes here.
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

		const env_texture_loader = new TextureLoader().load(bg_tex.url, (tex) => {
			if (bg_tex.mapping) tex.mapping = bg_tex.mapping
			scene.background = tex
		})

		return env_texture_loader
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

		const env_texture_loader = new TextureLoader().load(env_tex.url, (tex) => {
			tex.mapping = env_tex.mapping | EquirectangularReflectionMapping
			scene.environment = tex
		})

		return env_texture_loader
	}

	type BoxHelperParams = ConstructorParameters<typeof BoxHelper>
	export let boxParams: RemoveFirst<BoxHelperParams> = undefined
	/** Creates and adds a `BoxHelper`. */
	export let box: boolean = undefined

	$: if (box && scene && !scene.userData.box) add_box_helper()
	$: if (!box && scene.userData.box) remove_box_helper()

	function add_box_helper() {
		if (boxParams) {
			scene.userData.box = new BoxHelper(scene, ...boxParams)
		} else {
			scene.userData.box = new BoxHelper(scene)
		}

		scene.add(scene.userData.box)
	}

	function remove_box_helper() {
		if (scene.userData.box?.parent) {
			scene.userData.box.parent.remove(scene.userData.box)
			scene.userData.box = null
		}
	}

	export let interact: boolean = undefined

	let interactive: boolean = undefined
	const canvas_interactivity: Writable<{ enabled: boolean }> = getContext("canvas_interactivity")

	$: interactive = $canvas_interactivity.enabled

	let interactionEnabled: boolean = undefined
	$: interactionEnabled = interactive && interact

	export let onClick: SceneInteractionHandler = undefined

	export let onPointerUp: SceneInteractionHandler = undefined

	export let onPointerDown: SceneInteractionHandler = undefined

	export let onPointerOver: SceneInteractionHandler = undefined

	export let onPointerOut: SceneInteractionHandler = undefined

	export let onPointerEnter: SceneInteractionHandler = undefined

	export let onPointerLeave: SceneInteractionHandler = undefined

	export let onPointerMove: SceneInteractionHandler = undefined

	let ani: any

	let currentSceneActive = false
	$: currentSceneActive = $svelthreeStores[sti].scenes[scene.userData.index_in_scenes]?.isActive

	export let animation: SvelthreeAnimationFunction = undefined

	export let aniauto: boolean = undefined

	let animationEnabled: boolean = false
	$: if (animation) animationEnabled = true

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

					if (box && scene.userData.box) scene.userData.box.update()

					if (afterUpdate_inject_after) afterUpdate_inject_after()
			  }
	)
</script>

<!-- using context -->
<slot />

<!-- TODO  get rid of the SvelthreeAnimation component / create a ts class -->
{#if animation}
	<SvelthreeAnimation
		bind:this={ani}
		bind:currentSceneActive
		obj={scene}
		{animationEnabled}
		{animation}
		{aniauto}
		{log_lc}
	/>
{/if}

{#if $svelthreeStores[sti].renderer && $svelthreeStores[sti].renderer.xr.enabled === false}
	<SvelthreeInteraction {dispatch} obj={scene} parent={self} {interactionEnabled} {log_dev} {log_lc} />
{/if}
