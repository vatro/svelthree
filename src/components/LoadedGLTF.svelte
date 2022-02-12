<!--
`accessors:true` hast to be set per component because of the svelte-language-server bug, otherwise accessors would be falsely detected as missing and highlighted as errors.
svelthree uses svelte-accmod, where accessors are always `true`, regardless of `svelte:options`.  
-->
<svelte:options accessors />

<!--
@component
**svelthree** _LoadedGLTF_ Component.
[ tbd ]  Link to Docs.
-->
<script context="module" lang="ts">
	/** For typed objects being set as `props` 'shorthand' attribute values, e.g.:
	 * ```
	 * const my_init_props: Object3DProps = {...}
	 * component_ref.props = my_init_props
	 * ```
	 * */
	export type Object3DProps = OnlyWritableNonFunctionPropsPlus<
		Omit<Object3D, PropBlackList>,
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
		}
	>

	export type GLTFContainerInteractionHandler = (e?: CustomEvent) => void
</script>

<script lang="ts">
	import type { Scene } from "three"

	import { beforeUpdate, onMount, afterUpdate, onDestroy, getContext, setContext } from "svelte"
	import { get_current_component } from "svelte/internal"
	import { self as _self } from "svelte/internal"
	import { c_rs, c_lc, c_mau, c_dev, verbose_mode, get_comp_name } from "../utils/SvelthreeLogger"
	import type { LogLC, LogDEV } from "../utils/SvelthreeLogger"
	import type { OnlyWritableNonFunctionPropsPlus, PropBlackList } from "../types-extra"
	import type { Euler, Matrix4, Quaternion, Vector3 } from "three"

	import { svelthreeStores } from "../stores"
	import { PropUtils, SvelthreeProps } from "../utils"

	import { SvelthreeAnimation } from "../components-internal"
	import type { SvelthreeAnimationFunction, SvelthreeAnimationFunctionReturn } from "../types-extra"

	import { SvelthreeInteraction } from "../components-internal"
	import { createEventDispatcher } from "svelte"
	import type { Writable } from "svelte/store"

	import { BoxHelper } from "three"

	import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js"
	import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
	import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js"
	import type { AnimationClip, Group, Camera, Mesh, Light } from "three"
	import { Object3D, LoadingManager } from "three"
	import type { RemoveFirst } from "../types-extra"
	import { GLTF_afterLoaded, GLTF_utils } from "../utils"

	/**
	 * `browser` is needed for the SvelteKit setup (SSR / CSR / SPA).
	 * For non-SSR output in RollUp only and Vite only setups (CSR / SPA) we're just mimicing `$app/env` where `browser = true`,
	 * -> TS fix: `$app/env` mapped to `src/$app/env` via svelthree's `tsconfig.json`'s `path` property.
	 * -> RollUp only setup: replace `$app/env` with `../$app/env`
	 * The import below will work out-of-the-box in a SvelteKit setup.
	 */
	import { browser } from "$app/env"

	const self = get_current_component()
	const c_name = get_comp_name(self)

	const verbose: boolean = verbose_mode()

	export let log_all: boolean = false
	export let log_dev: { [P in keyof LogDEV]: LogDEV[P] } = log_all ? { all: true } : undefined
	export let log_rs: boolean = log_all
	export let log_lc: { [P in keyof LogLC]: LogLC[P] } = log_all ? { all: true } : undefined
	export let log_mau: boolean = log_all

	const dispatch = createEventDispatcher()

	let scene: Scene = getContext("scene")
	const sti: number = getContext("store_index")

	/** The (three) instance that was shared to this component as it's 'parent'. */
	let our_parent: Object3D = undefined

	/** Returns the `container` instance created by the component.
	 * If the `add` attribute is set to `true` (_default_) the contents of the loaded GLTF will be added to the `container`,
	 * which will then be added to it's parent component / parent object (three) instance.
	 * If the `add` attribute is set to `false`, the `container` instance will be `undefined`
	 * and you'll have to manage adding loaded GLTF assets to your scene graph by yourself. */
	export let container: Object3D = undefined

	export const is_svelthree_component: boolean = true
	export const is_svelthree_container: boolean = true

	// GENERATOR REMARK: 'reactive_re_creation_logic' not implemented for 'LoadedGLTF'!

	$: if (!container) {
		container = new Object3D()

		container.userData.initScale = container.scale.x
		container.userData.svelthreeComponent = self

		if (verbose && log_dev) console.debug(...c_dev(c_name, `${container.type} created!`, { container }))
	}

	// Determining 'parent' if 'container' instance has to be created first / was not provided on initialization ('create' is true).
	$: if (container && !our_parent) set_parent()

	function set_parent() {
		// get the instance that was shared to us as our 'parent'.
		our_parent = getContext("parent") || scene

		// share created object (three) instance to all children (slots) as 'parent'.
		setContext("parent", container)
	}

	/** If the `add` attribute is set to `true` (_default_) the contents of the loaded GLTF will be added to the `container`,
	 * which will then be added to it's parent component / parent object (three) instance.
	 * If the `add` attribute is set to `false`, the `container` instance will be `undefined`
	 * and you'll have to manage adding loaded GLTF assets to your scene graph by yourself. */
	export let add: boolean = true

	/** GLTF file `url` (_or path_). */
	export let url: string = undefined

	/** The url or path to the _Draco Decoder_.
	 * If set a [`DRACOLoader`](https://threejs.org/docs/#examples/en/loaders/DRACOLoader) instance will be created / used to decode compressed mesh data.
	 * [See threejs-docs.](https://threejs.org/docs/#examples/en/loaders/GLTFLoader) */
	export let draco: string = undefined

	/*
     see https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/crossorigin
      TODO  implement crossOrigin
    */
	//export let crossOrigin = "" // default 'anonymous' same as ""

	/** Specify a [`LoadingManager`](https://threejs.org/docs/#api/en/loaders/managers/LoadingManager).
	 * If not specified a [`DefaultLoadingManager`](https://threejs.org/docs/#api/en/loaders/managers/DefaultLoadingManager) will be used. */
	export let manager: LoadingManager = undefined

	let loader: GLTFLoader
	let dracoLoader: DRACOLoader
	export let content: GLTF = undefined

	$: if (manager) {
		loader = new GLTFLoader(manager)
	} else {
		loader = new GLTFLoader()
	}

	$: if (draco) {
		dracoLoader = new DRACOLoader()
		dracoLoader.setDecoderPath(draco)
		loader.setDRACOLoader(dracoLoader)
	}

	// TODO  Do we want this to be reactive, so we can change the GLTF file on-the-fly?
	$: if (browser) {
		if (url) {
			doLoad()
		} else {
			console.warn("SVELTHREE > LoadedGLTF : You have to provide an 'url' attribute to load some GLTF file!", {
				url
			})
		}
	}

	function onProgress(xhr: ProgressEvent): void {
		dispatch("progress", { total: xhr.total, loaded: xhr.loaded })
	}

	function doLoad(): void {
		//loaded = false // we could display something else here when loading?

		loader.loadAsync(url, onProgress).then((loadedGLTF: GLTF) => {
			content = loadedGLTF
			if (afterLoaded?.length) process_afterLoaded(0)
			dispatch("loaded")
		})
	}

	/** An Array of functions to perform with the loaded GLTF content.
	 * The first (`dummy`) argument will be internally replaced by the 'real' `content`-refrence.
	 * See `GLTF_afterLoaded` class for some premade common tasks.*/
	export let afterLoaded: ((dummy: GLTF, ...args: any[]) => Promise<void>)[] | undefined = undefined

	async function process_afterLoaded(fn_index: number) {
		dispatch("afterLoaded_start")
		//console.log("processAfterLoaded started!")

		if (afterLoaded?.length) {
			for (const fn of afterLoaded) {
				// this is correct like this! passing undefined breaks it.
				await fn(content)
			}
		}

		//console.log("processAfterLoaded finished!")
		dispatch("afterLoaded_finished")
	}

	$: if (content && add) add_content()

	function add_content(): void {
		if (container.parent === null) {
			if (our_parent) {
				if (content.scenes?.length > 1) {
					for (let i = 0; i < content.scenes.length; i++) {
						container.add(content.scenes[i])
					}
				} else if (content.scene) {
					container.add(content.scene)
				} else {
					console.error("SVELTHREE > GLTFLoader > no 'scenes' or 'scene' in GLTF!", { content })
				}

				our_parent.add(container)
			}
		}
	}

	/** Override object's `.matrixAutoUpdate` set (*on initialzation*) by scene's `.matrixAutoUpdate` (*default is `true`*). Also: `mau` can be changed on-the-fly.*/
	export let mau: boolean = undefined
	$: if (container) container.matrixAutoUpdate = scene.matrixAutoUpdate
	$: if (container && mau !== undefined) container.matrixAutoUpdate = mau

	export let name: string = undefined
	$: if (container && name) container.name = name

	/** ☝️ `matrix` **shorthand** attribute overrides ( *are ignored* ) `pos`, `rot`, `quat`, `scale` and `lookAt` 'shorthand' attributes! */
	export let matrix: Matrix4 | Parameters<Matrix4["set"]> = undefined

	const w_sh = PropUtils.getShortHandAttrWarnings(`SVELTHREE > ${c_name} >`)

	let sProps: SvelthreeProps

	// IMPORTANT  following 'shorthand' attributes will override `props` attribute!

	/** **shorthand** attribute for setting the `position` property. */
	export let pos: Vector3 | Parameters<Vector3["set"]> = undefined
	$: !matrix && container && pos ? set_pos() : pos && container ? console.warn(w_sh.pos) : null
	function set_pos() {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "pos", pos))
		PropUtils.setPositionFromValue(container, pos)
	}

	/** **shorthand** attribute for setting the `rotation` property. */
	export let rot:
		| Euler
		| Parameters<Euler["set"]>
		| Quaternion
		| Parameters<Quaternion["set"]>
		| Vector3
		| Parameters<Vector3["set"]> = undefined
	$: !matrix && !quat && container && rot ? set_rot() : rot && container ? console.warn(w_sh.rot) : null
	function set_rot() {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "rot", rot))
		PropUtils.setRotationFromValue(container, rot)
	}

	/** **shorthand** attribute for setting the `quaternion` property. */
	export let quat: Quaternion | Parameters<Quaternion["set"]> = undefined
	$: !matrix && container && quat ? set_quat() : quat && container ? console.warn(w_sh.quat) : null
	function set_quat() {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "quat", quat))
		PropUtils.setQuaternionFromValue(container, quat)
	}

	export let scale: Vector3 | Parameters<Vector3["set"]> = undefined
	$: !matrix && container && scale ? set_scale() : scale && container ? console.warn(w_sh.scale) : null
	function set_scale() {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "scale", scale))
		PropUtils.setScaleFromValue(container, scale)
	}

	/** */
	export let lookAt: Vector3 | Parameters<Vector3["set"]> | Object3D = undefined
	$: !matrix && container && lookAt ? set_lookat() : lookAt && container ? console.warn(w_sh.lookAt) : null
	function set_lookat() {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "lookAt", lookAt))
		PropUtils.setLookAtFromValue(container, lookAt)
	}

	// IMPORTANT  `matrix` 'shorthand' attribute will override all other transforms ('shorthand' attributes)!
	$: if (matrix && container) set_matrix()
	function set_matrix(): void {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "matrix", matrix))
		PropUtils.setMatrixFromValue(container, matrix)
	}

	export let castShadow: boolean = undefined
	$: if (castShadow !== undefined && content) GLTF_afterLoaded.for_all_meshes({ castShadow })(content)

	export let receiveShadow: boolean = undefined
	$: if (receiveShadow !== undefined && content) GLTF_afterLoaded.for_all_meshes({ receiveShadow })(content)

	type BoxHelperParams = ConstructorParameters<typeof BoxHelper>
	export let boxParams: RemoveFirst<BoxHelperParams> = undefined
	/** Creates and adds a `BoxHelper`. */
	export let box: boolean = undefined

	$: if (box && container && !container.userData.box) add_box_helper()
	$: if (!box && container.userData.box) remove_box_helper()

	function add_box_helper() {
		if (boxParams) {
			container.userData.box = new BoxHelper(container, ...boxParams)
		} else {
			container.userData.box = new BoxHelper(container)
		}

		scene.add(container.userData.box)
	}

	function remove_box_helper() {
		if (container.userData.box?.parent) {
			container.userData.box.parent.remove(container.userData.box)
			container.userData.box = null
		}
	}

	export let interact: boolean = undefined

	let interactive: boolean = undefined
	const canvas_interactivity: Writable<{ enabled: boolean }> = getContext("canvas_interactivity")

	$: interactive = $canvas_interactivity.enabled

	let interactionEnabled: boolean = undefined
	$: interactionEnabled = interactive && interact

	export let onClick: GLTFContainerInteractionHandler = undefined
	onClick // prevent 'unused-export-let' warning

	export let onPointerUp: GLTFContainerInteractionHandler = undefined
	onPointerUp // prevent 'unused-export-let' warning

	export let onPointerDown: GLTFContainerInteractionHandler = undefined
	onPointerDown // prevent 'unused-export-let' warning

	export let onPointerOver: GLTFContainerInteractionHandler = undefined
	onPointerOver // prevent 'unused-export-let' warning

	export let onPointerOut: GLTFContainerInteractionHandler = undefined
	onPointerOut // prevent 'unused-export-let' warning

	export let onPointerEnter: GLTFContainerInteractionHandler = undefined
	onPointerEnter // prevent 'unused-export-let' warning

	export let onPointerLeave: GLTFContainerInteractionHandler = undefined
	onPointerLeave // prevent 'unused-export-let' warning

	export let onPointerMove: GLTFContainerInteractionHandler = undefined
	onPointerMove // prevent 'unused-export-let' warning

	let ani: any

	let currentSceneActive = false
	$: currentSceneActive = $svelthreeStores[sti].scenes[scene.userData.index_in_scenes]?.isActive

	export let animation: SvelthreeAnimationFunction = undefined

	export let aniauto: boolean = undefined

	let animationEnabled: boolean = false
	$: if (animation) animationEnabled = true

	/** Removes the (three) instance of the object created by the component from it's parent. */
	export const remove_instance_from_parent = (): void => {
		if (container.parent) container.parent.remove(container)
	}
	/**
	 * Same as `remove_instance_from_parent()` just shorter syntax.
	 * Removes the (three) instance of the object created by the component from it's parent.
	 */
	export const remove = remove_instance_from_parent

	/** Returns the (three) instance of the object created by the component. */
	export const get_instance = (): Object3D => container

	export const get_animations = (): AnimationClip[] => content.animations
	export const get_scene = (): Group => content.scene
	export const get_scenes = (): Group[] => content.scenes
	export const get_cameras = (): Camera[] => content.cameras
	export const get_asset = (): { [key: string]: any } => content.asset
	export const get_scene_meshes = async (): Promise<Mesh[]> => await GLTF_utils.get_all_scene_meshes(content.scene)
	export const get_all_meshes = async (): Promise<Mesh[]> => await GLTF_utils.get_all_meshes(content)
	export const get_scene_lights = async (): Promise<Light[]> => await GLTF_utils.get_all_scene_lights(content.scene)
	export const get_all_lights = async (): Promise<Light[]> => await GLTF_utils.get_all_lights(content)

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
							...c_mau(c_name, "onMount : container.", {
								matrixAutoUpdate: container.matrixAutoUpdate,
								matrixWorldNeedsUpdate: container.matrixWorldNeedsUpdate
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
							...c_mau(c_name, "onDestroy : container.", {
								matrixAutoUpdate: container.matrixAutoUpdate,
								matrixWorldNeedsUpdate: container.matrixWorldNeedsUpdate
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
							...c_mau(c_name, "beforeUpdate : container.", {
								matrixAutoUpdate: container.matrixAutoUpdate,
								matrixWorldNeedsUpdate: container.matrixWorldNeedsUpdate
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
							...c_mau(c_name, "afterUpdate : container.", {
								matrixAutoUpdate: container.matrixAutoUpdate,
								matrixWorldNeedsUpdate: container.matrixWorldNeedsUpdate
							})
						)
					}

					if (afterUpdate_inject_before) afterUpdate_inject_before()

					// Update local matrix after all (props) changes (async microtasks) have been applied.
					if (!container.matrixAutoUpdate) container.updateMatrix()

					if (verbose && !container.matrixAutoUpdate && log_mau) {
						console.debug(
							...c_mau(c_name, "afterUpdate : container.", {
								matrixAutoUpdate: container.matrixAutoUpdate,
								matrixWorldNeedsUpdate: container.matrixWorldNeedsUpdate
							})
						)
					}

					if (box && container.userData.box) container.userData.box.update()

					if (afterUpdate_inject_after) afterUpdate_inject_after()
			  }
	)
</script>

<!-- TODO  get rid of the SvelthreeAnimation component / create a ts class -->
{#if animation}
	<SvelthreeAnimation
		bind:this={ani}
		bind:currentSceneActive
		obj={container}
		{animationEnabled}
		{animation}
		{aniauto}
		{log_lc}
	/>
{/if}

{#if $svelthreeStores[sti].renderer && $svelthreeStores[sti].renderer.xr.enabled === false}
	<SvelthreeInteraction {dispatch} obj={container} parent={self} {interactionEnabled} {log_dev} {log_lc} />
{/if}
