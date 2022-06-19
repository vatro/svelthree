<!--
`accessors:true` hast to be set per component because of the svelte-language-server bug, otherwise accessors would be falsely detected as missing and highlighted as errors.
svelthree uses svelte-accmod, where accessors are always `true`, regardless of `svelte:options`.  
-->
<svelte:options accessors />

<!--
@component
**svelthree** _DirectionalLight_ Component.
[ tbd ]  Link to Docs.
-->
<script context="module" lang="ts">
	export type DirectionalLightProps = OnlyWritableNonFunctionPropsPlus<
		Omit<DirectionalLight, PropBlackList>,
		{
			// CUSTOM  actually no `lookAt` on DirectionalLight, we're using custom solution!
			lookAt: Vector3 | Parameters<Vector3["set"]> | Object3D

			position?: Vector3 | Parameters<Vector3["set"]>

			// EXCLUDED  THREE :Lights with `target` property use the target for rotation calulation!
			//rotation?: never

			// EXCLUDED  THREE :Lights with `target` property use the target for rotation calulation!
			//quaternion?: never

			// TODO  can I manipulate the matrix?
			matrix?: Matrix4 | Parameters<Matrix4["set"]>
		}
	>
</script>

<script lang="ts">
	import type { Scene } from "three"

	import { beforeUpdate, onMount, afterUpdate, onDestroy, getContext, setContext, tick } from "svelte"
	import { get_current_component } from "svelte/internal"
	import { self as _self } from "svelte/internal"
	import { c_rs, c_lc, c_mau, c_dev, verbose_mode, get_comp_name } from "../utils/SvelthreeLogger"
	import type { LogLC, LogDEV } from "../utils/SvelthreeLogger"
	import type { SvelthreeShadowDOMElement } from "../types-extra"

	import type { OnlyWritableNonFunctionPropsPlus, PropBlackList } from "../types-extra"

	import type { Euler, Matrix4, Quaternion, Vector3 } from "three"

	import { svelthreeStores } from "svelthree/stores"
	import { PropUtils, SvelthreeProps } from "../utils"

	import { SvelthreeAnimation } from "../ani"
	import type { SvelthreeAnimationFunction, SvelthreeAnimationFunctionReturn } from "../types-extra"

	import { SvelthreeLightWithShadow } from "../components-internal"
	import type { LightShadowCamProps, LightShadowProps } from "../types-extra"

	//import type { Empty, Mesh } from "."
	import type { Targetable } from "../types-extra"
	import { LightTarget } from "../utils"
	import { Object3D } from "three"

	import { DirectionalLight, DirectionalLightHelper } from "three"
	import type { DirectionalLightShadow } from "three"
	import type { Color } from "three"
	import type { RemoveFirst } from "../types-extra"
	import { get_root_scene } from "../utils/SceneUtils"
	import type { Writable } from "svelte/store"

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

	let scene: Scene = getContext("scene")
	const sti: number = getContext("store_index")

	/** [ **feature**: allow providing (_injection_) of (_already created_) threejs object instances ].
	 * `create` is an internal indicator for how the component's corresponding threejs object instance has to be / has been created.
	 * It's being set to `false` on initialization if an (_already created_) threejs object instance was provided,
	 * otherwise it's set to `true`, means a new threejs object instance will be created. */
	let create = false

	/** The (three) instance that was shared to this component as it's 'parent'. */
	let our_parent: Object3D = undefined

	/** Returns the `light` instance created by the component & allows providing (_injection_) of (_already created / premade_) `THREE.DirectionalLight` instances. */
	export let light: DirectionalLight = undefined
	let light_uuid: string = undefined

	export const is_svelthree_component: boolean = true
	export const is_svelthree_light: boolean = true

	if (light) {
		create = false
		on_instance_provided()
	} else {
		create = true
	}

	/** IMPORTANT  Executed when / if an instance was provided **on initializiation** -> only once if at all! */
	function on_instance_provided(): void {
		// check if type of provided instance is correct and then do something with it...
		if (light.type === "DirectionalLight") {
			light.userData.initScale = light.scale.x
			light.userData.svelthreeComponent = self
		} else {
			throw new Error(
				`SVELTHREE > DirectionalLight Error: provided 'light' instance has wrong type '${light.type}', should be 'DirectionalLight'!`
			)
		}
	}

	// Determining 'parent' on initialization if 'light' instance was provided ('create' is false).
	if (!create) {
		// get the instance that was shared to us as our 'parent'.
		our_parent = getContext("parent") || scene

		// share created object (three) instance to all children (slots) as 'parent'.
		setContext("parent", light)
	}
	// GENERATOR REMARK: 'reactive_re_creation_logic' not implemented for 'DirectionalLight'!

	/** Initializes `DirectionalLight` with provided constructor parameters.*/
	export let params: ConstructorParameters<typeof DirectionalLight> = undefined

	$: if (!light && create) {
		if (params) {
			light = new DirectionalLight(...params)
		} else {
			light = new DirectionalLight()
		}

		light_uuid = light.uuid

		light.userData.initScale = light.scale.x
		light.userData.svelthreeComponent = self

		if (verbose && log_dev) console.debug(...c_dev(c_name, `${light.type} created!`, { light }))
	}

	// Determining 'parent' if 'light' instance has to be created first / was not provided on initialization ('create' is true).
	$: if (light && create && !our_parent) set_parent()

	function set_parent() {
		// get the instance that was shared to us as our 'parent'.
		our_parent = getContext("parent") || scene

		// share created object (three) instance to all children (slots) as 'parent'.
		setContext("parent", light)
	}

	// this statement is being triggered on creation / recreation
	$: if (light && ((light_uuid && light_uuid !== light.uuid) || light.parent !== our_parent)) add_instance_to()

	function add_instance_to(): void {
		// if 'light' was already created or set via 'light' attribute before
		if (light_uuid && light.uuid !== light_uuid) {
			// remove old instance and update references where needed

			const old_instance: Object3D = scene.getObjectByProperty("uuid", light_uuid)

			if (old_instance.userData.helper?.parent) {
				old_instance.userData.helper.parent.remove(old_instance.userData.helper)
				old_instance.userData.helper = null
			}

			if (old_instance.userData.box?.parent) {
				old_instance.userData.helper.parent.remove(old_instance.userData.helper)
				old_instance.userData.box = null
			}

			if (old_instance.parent) old_instance.parent.remove(old_instance)

			// recreate 'SvelthreeProps'
			// - all initially set props will be applied to the new instance.
			// - 'props' attribute can be used directly after light reassignment.
			sProps = new SvelthreeProps(light)
		}

		// add `light` to `our_parent`
		if (our_parent) {
			if (light.parent !== our_parent) {
				our_parent.add(light)
				light_uuid = light.uuid

				if (verbose && log_dev) {
					console.debug(
						...c_dev(c_name, `${light.type} was added to ${our_parent.type}!`, {
							light,
							scene,
							total: scene.children.length
						})
					)
				}
			} else {
				// silently nothing
				//console.warn(`'light' was already added to (is a child of) ${get_comp_name(our_parent)}`, {light, our_parent, scene})
			}
		} else {
			console.error("No 'our_parent' (or 'scene')! Nothing to add 'light' to!", { light, our_parent, scene })
		}
	}

	// accessability -> shadow dom element

	/** Shadow DOM element created by the component, needed for accessability features, event propagation etc. */
	export let shadow_dom_el: SvelthreeShadowDOMElement = undefined

	$: if (shadow_root_el && light && !shadow_dom_el) create_shadow_dom_target()

	async function create_shadow_dom_target() {
		if (browser) {
			// DUCKTAPE  `getContext()` wrong order fix, see [#72](https://github.com/vatro/svelthree/issues/72)
			await tick()

			shadow_dom_el = document.createElement("div")

			shadow_dom_el.dataset.kind = "DirectionalLight"
			if (name) shadow_dom_el.dataset.name = name

			const parent_shadow_dom_target = our_parent?.userData.svelthreeComponent.shadow_dom_el
			const shadow_target: SvelthreeShadowDOMElement = parent_shadow_dom_target || shadow_root_el

			if (shadow_target) {
				shadow_target.appendChild(shadow_dom_el)
			} else {
				console.error(
					"SVELTHREE > DirectionalLight > create_shadow_dom_target > Wasn't able to append shadow DOM element, no 'shadow_target'!",
					{ shadow_target },
					{ parent_shadow_dom_target },
					{ our_parent }
				)
			}
		}
	}

	// accessability -> shadow dom focusable
	export let tabindex: number = undefined

	$: if (shadow_dom_el && tabindex !== undefined) {
		shadow_dom_el.tabIndex = tabindex
	}

	// accessability -> shadow dom wai-aria
	export let aria: Partial<ARIAMixin> = undefined

	$: if (shadow_dom_el && aria !== undefined) {
		for (const key in aria) {
			if (key === "ariaLabel") {
				// add specified `ariaLabel` as text to generated shadow DOM `<div>` element (for better reader support / indexing (?))
				//  TODO  RECONSIDER  needs to be tested more, may be obsolete (?).
				shadow_dom_el.innerText += `${aria[key]}`
			}

			shadow_dom_el[key] = aria[key]
		}
	}

	/** Defaults to `true` which means that components / objects with targets (_`DirectionalLight`, `SpotLight`, `OrthographicCamera` and `PerspectiveCamera`_)
	 * will add the built-in 'blank' target-Object3D to component's / object's parent on initialization. `target` can be either set to `false` ( TODO ) (_which will remove the target from parent only if it's
	 * not the built-in 'blank' `Object3D`_) or some other object in the scene (_any `Object3D`, an `Empty` component or a `Mesh` component_) */
	export let target: Targetable | boolean = undefined
	$: if (target === undefined) target = true

	let light_target = undefined
	$: if (light && scene && target) light_target = new LightTarget(false, target, scene, light)

	$: if (!matrix && light && target && light_target) light_target.change = true

	// if the Light is a Light with a 'target' property, start / stop monitoring 'target' position changes if helper is enabled / disabled
	$: !matrix && light && target && light_target && light.target?.isObject3D && $svelthreeStores[sti].rendererComponent
		? start_monitoring_target_position()
		: stop_monitoring_target_position()

	// call this to remove the renderer component listener
	let remove_target_position_listener: () => void

	function start_monitoring_target_position(): void {
		// IMPORTANT  this does NOT cause a component update! (instead of using requestAnimationFrame)
		// COOL!  this way the helper is 100% synchronious (not 1 frame late)
		if (!remove_target_position_listener) {
			if (verbose && log_rs) console.debug(...c_rs(c_name, "start_monitoring_target_position!"))
			remove_target_position_listener = $svelthreeStores[sti].rendererComponent.$on(
				"before_render_int",
				update_light_target
			)
		}
	}

	function update_light_target(): void {
		light_target.update(helper)
	}

	function stop_monitoring_target_position(): void {
		if (remove_target_position_listener) {
			remove_target_position_listener()
			remove_target_position_listener = undefined
			kill_light_target()
		}
	}

	function kill_light_target(): void {
		if (!target) {
			light_target = null

			if (light.target) {
				// remove target from parent only if it's the built-in target
				if (light.target.userData.is_builtin_target && light.target.parent) {
					light.target.parent.remove(light.target)
				}
				// recreate / reset target
				light.target = new Object3D()
			}
		}
	}

	/** Override object's `.matrixAutoUpdate` set (*on initialzation*) by scene's `.matrixAutoUpdate` (*default is `true`*). Also: `mau` can be changed on-the-fly.*/
	export let mau: boolean = undefined
	$: if (light) light.matrixAutoUpdate = scene.matrixAutoUpdate
	$: if (light && mau !== undefined) light.matrixAutoUpdate = mau

	export let name: string = undefined
	$: if (light && name) light.name = name

	/** ☝️ `matrix` **shorthand** attribute overrides ( *are ignored* ) `pos`, `rot`, `quat`, `scale` and `lookAt` 'shorthand' attributes! */
	export let matrix: Matrix4 | Parameters<Matrix4["set"]> = undefined

	const w_sh = PropUtils.getShortHandAttrWarnings(`SVELTHREE > ${c_name} >`)

	let sProps: SvelthreeProps

	// IMPORTANT  `props` will be overridden by 'shorthand' attributes!
	/** **shorthand** attribute for setting properties using key-value pairs in an `Object`. */
	export let props: { [P in keyof DirectionalLightProps]: DirectionalLightProps[P] } = undefined

	$: if (!sProps && light && props) sProps = new SvelthreeProps(light)
	$: if (props && sProps) update_props()
	function update_props() {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "props", props))
		sProps.update(props)
	}

	// IMPORTANT  following 'shorthand' attributes will override `props` attribute!

	/** **shorthand** attribute for setting the `position` property. */
	export let pos: Vector3 | Parameters<Vector3["set"]> = undefined
	$: !matrix && light && pos ? set_pos() : pos && light ? console.warn(w_sh.pos) : null
	function set_pos() {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "pos", pos))
		PropUtils.setPositionFromValue(light, pos)
	}

	/** With components / objects having a `target` property like `DirectionalLight`, `lookAt` is used to specify a **point (coordinates) in world space** and cannot be set to an `Object3D`!
	 * By setting `LookAt` to some value, you're basically moving the built-in 'blank' `Object3D` used as a point in space to look at.
	 * ☝️ _In order to update the `DirectionalLightHelper` correctly, the `target: boolean` attribute needs to be set / set to `true` (**default**)!_ */
	export let lookAt: Vector3 | Parameters<Vector3["set"]> | Object3D = undefined
	$: !matrix && light && lookAt ? set_lookat() : lookAt && light ? console.warn(w_sh.lookAt) : null
	function set_lookat() {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "lookAt", lookAt))
		PropUtils.setLookAtFromValue(light, lookAt)
	}

	// IMPORTANT  `matrix` 'shorthand' attribute will override all other transforms ('shorthand' attributes)!
	$: if (matrix && light) set_matrix()
	function set_matrix(): void {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "matrix", matrix))
		PropUtils.setMatrixFromValue(light, matrix)
	}

	export let color: Color | string | number | [r: number, g: number, b: number] | number[] | Vector3 = undefined
	$: if (color) set_color()
	function set_color(): void {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "color", color))
		PropUtils.setColorFromValueKey(light, color, "color")
	}

	/** The light's intensity. Default is 1. */
	export let intensity: number = undefined
	$: if (light && intensity !== undefined) set_intensity()
	function set_intensity(): void {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "intensity", intensity))
		light.intensity = intensity
	}

	export let shadowMapSize: number = undefined

	export let shadowBias: number = undefined

	export let castShadow: boolean = undefined

	/** **shorthand** attribute for setting properties of `light.shadow` using key-value pairs in an `Object`. */
	export let shadowProps: {
		[P in keyof LightShadowProps<DirectionalLightShadow>]: LightShadowProps<DirectionalLightShadow>[P]
	} = undefined

	/** **shorthand** attribute for setting properties of `light.shadow.camera` using key-value pairs in an `Object`. */
	export let shadowCameraProps: {
		[P in keyof LightShadowCamProps<typeof light.shadow.camera>]: LightShadowCamProps<typeof light.shadow.camera>[P]
	} = undefined

	type HelperParams = ConstructorParameters<typeof DirectionalLightHelper>
	export let helperParams: RemoveFirst<HelperParams> = undefined
	export let helper: boolean = undefined

	$: light && !light.userData.helper && helper ? add_helper() : null
	$: light && light.userData.helper && !helper ? remove_helper() : null

	function add_helper(): void {
		if (helperParams) {
			light.userData.helper = new DirectionalLightHelper(light, ...helperParams)
		} else {
			light.userData.helper = new DirectionalLightHelper(light)
		}

		scene.add(light.userData.helper)
	}

	function remove_helper(): void {
		if (light.userData.helper?.parent) {
			light.userData.helper.parent.remove(light.userData.helper)
			light.userData.helper = null
		}
	}

	/** Animation logic to be performed with the (three) object instance created by the component. */
	export let animation: SvelthreeAnimationFunction = undefined

	let animationEnabled: boolean = false
	$: if (animation) animationEnabled = true

	/** Immediately start provided animation, default: `false`. Alternative: `<component_reference>.start_animation()` or shorter `.start_ani()`. */
	export let aniauto: boolean = undefined

	let ani: SvelthreeAnimation
	$: if (animation && animationEnabled) ani = new SvelthreeAnimation(scene, light, animation, aniauto)

	let currentSceneActive = undefined
	$: currentSceneActive = $svelthreeStores[sti].scenes[scene.userData.index_in_scenes]?.isActive
	$: if (ani && currentSceneActive !== undefined) ani.onCurrentSceneActiveChange(currentSceneActive)

	/** The root scene -> `scene.parent = null`. */
	let root_scene: Scene | null = undefined
	$: if (root_scene === undefined) root_scene = get_root_scene(getContext("scene"))

	$: if (light && root_scene) {
		light.userData.root_scene = root_scene
	}

	export const get_helper = (): DirectionalLightHelper => light.userData.helper as DirectionalLightHelper

	/** Removes the (three) instance of the object created by the component from it's parent. */
	export const remove_instance_from_parent = (): void => {
		if (light.parent) light.parent.remove(light)
	}
	/**
	 * Same as `remove_instance_from_parent()` just shorter syntax.
	 * Removes the (three) instance of the object created by the component from it's parent.
	 */
	export const remove = remove_instance_from_parent

	/** Returns the (three) instance of the object created by the component. */
	export const get_instance = (): DirectionalLight => light

	/** Returns the `animation` object. */
	export const get_animation = (): any => ani.getAnimation()
	/** Same as `get_animation()` just shorter syntax. Returns the `animation` object. */
	export const get_ani = get_animation

	/** Starts the `animation` object. */
	export const start_animation = (): void => ani.startAni()
	/** Same as `start_animation()` just shorter syntax. Starts the `animation` object. */
	export const start_ani = start_animation

	/** Sets `focus()` on the component / it's shadow dom element. */
	export const focused = (): void => shadow_dom_el.focus()

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
							...c_mau(c_name, "onMount : light.", {
								matrixAutoUpdate: light.matrixAutoUpdate,
								matrixWorldNeedsUpdate: light.matrixWorldNeedsUpdate
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
							...c_mau(c_name, "onDestroy : light.", {
								matrixAutoUpdate: light.matrixAutoUpdate,
								matrixWorldNeedsUpdate: light.matrixWorldNeedsUpdate
							})
						)
					}

					if (onDestroy_inject_before) onDestroy_inject_before()

					remove_helper()
					if (ani) ani.destroyAnimation()
					remove_instance_from_parent()

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
							...c_mau(c_name, "beforeUpdate : light.", {
								matrixAutoUpdate: light.matrixAutoUpdate,
								matrixWorldNeedsUpdate: light.matrixWorldNeedsUpdate
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
							...c_mau(c_name, "afterUpdate : light.", {
								matrixAutoUpdate: light.matrixAutoUpdate,
								matrixWorldNeedsUpdate: light.matrixWorldNeedsUpdate
							})
						)
					}

					if (afterUpdate_inject_before) afterUpdate_inject_before()

					// Update local matrix after all (props) changes (async microtasks) have been applied.
					if (!light.matrixAutoUpdate) light.updateMatrix()

					if (verbose && !light.matrixAutoUpdate && log_mau) {
						console.debug(
							...c_mau(c_name, "afterUpdate : light.", {
								matrixAutoUpdate: light.matrixAutoUpdate,
								matrixWorldNeedsUpdate: light.matrixWorldNeedsUpdate
							})
						)
					}

					if (helper && light.userData.helper) light.userData.helper.update()

					if ($svelthreeStores[sti].rendererComponent?.mode === "auto") {
						root_scene.userData.dirty = true
						$svelthreeStores[sti].rendererComponent.schedule_render_auto(root_scene)
					}

					if (afterUpdate_inject_after) afterUpdate_inject_after()
			  }
	)
</script>

<slot />

<SvelthreeLightWithShadow
	{light}
	{shadowMapSize}
	{shadowBias}
	{castShadow}
	{shadowProps}
	{shadowCameraProps}
	{log_dev}
/>
