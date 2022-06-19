<!--
`accessors:true` hast to be set per component because of the svelte-language-server bug, otherwise accessors would be falsely detected as missing and highlighted as errors.
svelthree uses svelte-accmod, where accessors are always `true`, regardless of `svelte:options`.  
-->
<svelte:options accessors />

<!--
@component
**svelthree** _PerspectiveCamera_ Component.
[ tbd ]  Link to Docs.
-->
<script context="module" lang="ts">
	/** For typed objects being set as `props` 'shorthand' attribute values, e.g.:
	 * ```
	 * const my_init_props: PerspectiveCameraProps = {...}
	 * component_ref.props = my_init_props
	 * ```
	 * */
	export type PerspectiveCameraProps = OnlyWritableNonFunctionPropsPlus<
		Omit<PerspectiveCamera, PropBlackList>,
		{
			lookAt?: Vector3 | Parameters<Vector3["set"]> | Object3D
			position?: Vector3 | Parameters<Vector3["set"]>
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

	import type { Euler, Matrix4, Object3D, Quaternion, Vector3 } from "three"

	import { svelthreeStores } from "svelthree/stores"
	import { PropUtils, SvelthreeProps } from "../utils"

	import { SvelthreeAnimation } from "../ani"
	import type { SvelthreeAnimationFunction, SvelthreeAnimationFunctionReturn } from "../types-extra"

	import { PerspectiveCamera, CameraHelper } from "three"
	import { get_root_scene } from "../utils/SceneUtils"
	import { CAM_PROPS_PMU } from "../constants/Cameras"
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

	// TODO  CHECK THIS COMMENT: Add ability to add Camera to an Interaction-Dummy (Mesh) like with Lights
	// TODO  CHECK usage with Orbitcontrols!

	/** `id` is used to internally identify / assign a Camera to a 'WebGLRenderer' component. */
	export let id: string = undefined

	if (!id) {
		throw new Error(
			"SVELTHREE > PerspectiveCamera : you have to provide an 'id' prop (not empty String) for Cameras in order to assign them to a 'WebGLRenderer' component!"
		)
	}

	let scene: Scene = getContext("scene")
	const sti: number = getContext("store_index")

	/** [ **feature**: allow providing (_injection_) of (_already created_) threejs object instances ].
	 * `create` is an internal indicator for how the component's corresponding threejs object instance has to be / has been created.
	 * It's being set to `false` on initialization if an (_already created_) threejs object instance was provided,
	 * otherwise it's set to `true`, means a new threejs object instance will be created. */
	let create = false

	/** The (three) instance that was shared to this component as it's 'parent'. */
	let our_parent: Object3D = undefined

	/** Returns the `camera` instance created by the component & allows providing (_injection_) of (_already created / premade_) `THREE.PerspectiveCamera` instances. */
	export let camera: PerspectiveCamera = undefined
	let camera_uuid: string = undefined
	let camera_is_active: boolean = undefined
	let index_in_cameras: number = undefined

	export const is_svelthree_component: boolean = true
	export const is_svelthree_camera: boolean = true

	if (camera) {
		create = false
		on_instance_provided()
	} else {
		create = true
	}

	/** IMPORTANT  Executed when / if an instance was provided **on initializiation** -> only once if at all! */
	function on_instance_provided(): void {
		// check if type of provided instance is correct and then do something with it...
		if (camera.type === "PerspectiveCamera") {
			camera.userData.initScale = camera.scale.x
			camera.userData.svelthreeComponent = self
		} else {
			throw new Error(
				`SVELTHREE > PerspectiveCamera Error: provided 'camera' instance has wrong type '${camera.type}', should be 'PerspectiveCamera'!`
			)
		}
	}

	// Determining 'parent' on initialization if 'camera' instance was provided ('create' is false).
	if (!create) {
		// get the instance that was shared to us as our 'parent'.
		our_parent = getContext("parent") || scene

		// share created object (three) instance to all children (slots) as 'parent'.
		setContext("parent", camera)
	}
	// GENERATOR REMARK: 'reactive_re_creation_logic' not implemented for 'PerspectiveCamera'!

	/** Initializes `PerspectiveCamera` with provided constructor parameters.*/
	export let params: ConstructorParameters<typeof PerspectiveCamera> = undefined

	$: if (!camera && create) {
		if (params) {
			camera = new PerspectiveCamera(...params)
		} else {
			camera = new PerspectiveCamera()
		}

		camera_uuid = camera.uuid

		camera.userData.initScale = camera.scale.x
		camera.userData.svelthreeComponent = self

		camera.userData.id = id

		camera_is_active = false
		camera.userData.isActive = camera_is_active

		$svelthreeStores[sti].cameras.push({
			camera: camera,
			id: id,
			isActive: camera_is_active
		})

		index_in_cameras = camera.userData.index_in_cameras

		if (verbose && log_dev) console.debug(...c_dev(c_name, `${camera.type} created!`, { camera }))
	}

	// Determining 'parent' if 'camera' instance has to be created first / was not provided on initialization ('create' is true).
	$: if (camera && create && !our_parent) set_parent()

	function set_parent() {
		// get the instance that was shared to us as our 'parent'.
		our_parent = getContext("parent") || scene

		// share created object (three) instance to all children (slots) as 'parent'.
		setContext("parent", camera)
	}

	// this statement is being triggered on creation / recreation
	$: if (camera && ((camera_uuid && camera_uuid !== camera.uuid) || camera.parent !== our_parent)) add_instance_to()

	function add_instance_to(): void {
		// if 'camera' was already created or set via 'camera' attribute before
		if (camera_uuid && camera.uuid !== camera_uuid) {
			// remove old instance and update references where needed

			const old_instance: Object3D = scene.getObjectByProperty("uuid", camera_uuid)

			// update 'index_in_x'
			index_in_cameras = old_instance.userData.index_in_cameras

			if (old_instance.userData.helper?.parent) {
				old_instance.userData.helper.parent.remove(old_instance.userData.helper)
				old_instance.userData.helper = null
			}

			if (old_instance.userData.box?.parent) {
				old_instance.userData.helper.parent.remove(old_instance.userData.helper)
				old_instance.userData.box = null
			}

			if (old_instance.parent) old_instance.parent.remove(old_instance)

			camera.userData.id = id
			camera.userData.index_in_cameras = index_in_cameras

			$svelthreeStores[sti].cameras[index_in_cameras].camera = camera

			camera.userData.isActive = $svelthreeStores[sti].cameras[index_in_cameras].isActive

			if (camera.userData.isActive) {
				$svelthreeStores[sti].activeCamera = camera

				// tells renderer to update the 'current_cam' instance (on-the-fly), see 'WebGLRenderer.renderStandard()'.
				old_instance.userData.renderer_currentcam_needsupdate = true
			}

			// recreate 'SvelthreeProps'
			// - all initially set props will be applied to the new instance.
			// - 'props' attribute can be used directly after camera reassignment.
			sProps = new SvelthreeProps(camera)
		}

		// add `camera` to `our_parent`
		if (our_parent) {
			if (camera.parent !== our_parent) {
				our_parent.add(camera)
				camera_uuid = camera.uuid

				if (verbose && log_dev) {
					console.debug(
						...c_dev(c_name, `${camera.type} was added to ${our_parent.type}!`, {
							camera,
							scene,
							total: scene.children.length
						})
					)
				}
			} else {
				// silently nothing
				//console.warn(`'camera' was already added to (is a child of) ${get_comp_name(our_parent)}`, {camera, our_parent, scene})
			}
		} else {
			console.error("No 'our_parent' (or 'scene')! Nothing to add 'camera' to!", { camera, our_parent, scene })
		}
	}

	// accessability -> shadow dom element

	/** Shadow DOM element created by the component, needed for accessability features, event propagation etc. */
	export let shadow_dom_el: SvelthreeShadowDOMElement = undefined

	$: if (shadow_root_el && camera && !shadow_dom_el) create_shadow_dom_target()

	async function create_shadow_dom_target() {
		if (browser) {
			// DUCKTAPE  `getContext()` wrong order fix, see [#72](https://github.com/vatro/svelthree/issues/72)
			await tick()

			shadow_dom_el = document.createElement("div")

			shadow_dom_el.dataset.kind = "PerspectiveCamera"
			if (name) shadow_dom_el.dataset.name = name

			const parent_shadow_dom_target = our_parent?.userData.svelthreeComponent.shadow_dom_el
			const shadow_target: SvelthreeShadowDOMElement = parent_shadow_dom_target || shadow_root_el

			if (shadow_target) {
				shadow_target.appendChild(shadow_dom_el)
			} else {
				console.error(
					"SVELTHREE > PerspectiveCamera > create_shadow_dom_target > Wasn't able to append shadow DOM element, no 'shadow_target'!",
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

	/** Override object's `.matrixAutoUpdate` set (*on initialzation*) by scene's `.matrixAutoUpdate` (*default is `true`*). Also: `mau` can be changed on-the-fly.*/
	export let mau: boolean = undefined
	$: if (camera) camera.matrixAutoUpdate = scene.matrixAutoUpdate
	$: if (camera && mau !== undefined) camera.matrixAutoUpdate = mau

	export let name: string = undefined
	$: if (camera && name) camera.name = name

	/** ☝️ `matrix` **shorthand** attribute overrides ( *are ignored* ) `pos`, `rot`, `quat`, `scale` and `lookAt` 'shorthand' attributes! */
	export let matrix: Matrix4 | Parameters<Matrix4["set"]> = undefined

	const w_sh = PropUtils.getShortHandAttrWarnings(`SVELTHREE > ${c_name} >`)

	let sProps: SvelthreeProps

	/** If `.status` is `true`, camera's projection matrix will be updated on `afterUpdate` (_on change of any of the related props_). */
	let update_projection_matrix = { status: false }

	// IMPORTANT  `props` will be overridden by 'shorthand' attributes!
	/** **shorthand** attribute for setting properties using key-value pairs in an `Object`. */
	export let props: { [P in keyof PerspectiveCameraProps]: PerspectiveCameraProps[P] } = undefined

	$: if (!sProps && camera && props) sProps = new SvelthreeProps(camera)
	$: if (props && sProps) update_props()
	function update_props() {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "props", props))

		const updated_keys: string[] = sProps.update(props)
		if (updated_keys_need_pmu(updated_keys)) {
			update_projection_matrix.status = true
		}
	}

	function updated_keys_need_pmu(updated_keys: string[]): boolean {
		for (let i = 0; i < updated_keys.length; i++) {
			if (CAM_PROPS_PMU.has(updated_keys[i])) return true
		}
		return false
	}

	// IMPORTANT  following 'shorthand' attributes will override `props` attribute!

	/** **shorthand** attribute for setting the `position` property. */
	export let pos: Vector3 | Parameters<Vector3["set"]> = undefined
	$: !matrix && camera && pos ? set_pos() : pos && camera ? console.warn(w_sh.pos) : null
	function set_pos() {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "pos", pos))
		PropUtils.setPositionFromValue(camera, pos)
	}

	/** **shorthand** attribute for setting the `rotation` property. */
	export let rot:
		| Euler
		| Parameters<Euler["set"]>
		| Quaternion
		| Parameters<Quaternion["set"]>
		| Vector3
		| Parameters<Vector3["set"]> = undefined
	$: !matrix && !quat && camera && rot ? set_rot() : rot && camera ? console.warn(w_sh.rot) : null
	function set_rot() {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "rot", rot))
		PropUtils.setRotationFromValue(camera, rot)
	}

	/** **shorthand** attribute for setting the `quaternion` property. */
	export let quat: Quaternion | Parameters<Quaternion["set"]> = undefined
	$: !matrix && camera && quat ? set_quat() : quat && camera ? console.warn(w_sh.quat) : null
	function set_quat() {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "quat", quat))
		PropUtils.setQuaternionFromValue(camera, quat)
	}

	export let scale: Vector3 | Parameters<Vector3["set"]> = undefined
	$: !matrix && camera && scale ? set_scale() : scale && camera ? console.warn(w_sh.scale) : null
	function set_scale() {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "scale", scale))
		PropUtils.setScaleFromValue(camera, scale)
	}

	/** */
	export let lookAt: Vector3 | Parameters<Vector3["set"]> | Object3D = undefined
	$: !matrix && camera && lookAt ? set_lookat() : lookAt && camera ? console.warn(w_sh.lookAt) : null
	function set_lookat() {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "lookAt", lookAt))
		PropUtils.setLookAtFromValue(camera, lookAt)
	}

	const canvas_dom: Writable<{ element: HTMLCanvasElement }> = getContext("canvas_dom")

	const canvas_dim: Writable<{ w: number; h: number }> = getContext("canvas_dim")

	let aspect_updated_on_init: boolean = false

	/** Camera frustum aspect ratio, usually the `canvas width / canvas height`.
	 * **svelthree** always sets the aspect of the camera automatically _once_ on initialization to match canvas dimensions.
	 * ☝️ Setting `aspect:boolean` (e.g. `aspect = { true }` or just adding `aspect`) will result in **reactive aspect updates** on canvas dimensions change. */
	export let aspect: number | boolean = undefined

	// update aspect on init once if no aspect is set by the user
	$: if (!matrix && aspect === undefined && !aspect_updated_on_init && camera && $canvas_dom.element && $canvas_dim) {
		set_aspect_on_init()
	}

	function set_aspect_on_init() {
		aspect_updated_on_init = true
		camera.aspect = calc_aspect()
		camera.updateProjectionMatrix()
		if (verbose && log_rs) console.debug(...c_rs(c_name, "aspect (on init, no aspect)", camera.aspect))
	}

	// update aspect as a number value
	$: if (!matrix && camera && typeof aspect === "number") set_aspect_as_num()

	function set_aspect_as_num() {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "aspect", aspect))
		camera.aspect = aspect as number
		camera.updateProjectionMatrix()
	}

	// auto update aspect on canvas dimensions change
	$: if (!matrix && aspect === true && camera && $canvas_dom.element && $canvas_dim) autoupdate_aspect()

	function autoupdate_aspect() {
		camera.aspect = calc_aspect()
		camera.updateProjectionMatrix()
		if (verbose && log_rs) console.debug(...c_rs(c_name, "aspect auto update", camera.aspect))
	}

	function calc_aspect(): number {
		//return canvasW / canvasH
		return $canvas_dim.w / $canvas_dim.h
	}

	/** Camera frustum far plane. Default is `2000`.
	 * [See threejs-docs.](https://threejs.org/docs/#api/en/cameras/PerspectiveCamera.far) */
	export let far: number = undefined
	$: if (!matrix && camera && far !== undefined) set_far()
	function set_far(): void {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "far", far))
		camera.far = far
		update_projection_matrix.status = true
	}

	/** Film size used for the larger axis. Default is `35` (millimeters). This parameter does not influence the projection matrix unless `.filmOffset` is set to a `nonzero` value.
	 * [See threejs-docs.](https://threejs.org/docs/#api/en/cameras/PerspectiveCamera.filmGauge) */
	export let filmGauge: number = undefined
	$: if (!matrix && camera && filmGauge !== undefined) set_filmGauge()
	function set_filmGauge(): void {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "filmGauge", filmGauge))
		camera.filmGauge = filmGauge
		update_projection_matrix.status = true
	}

	/** Horizontal off-center offset in the same unit as `.filmGauge`. Default is `0`.
	 * [See threejs-docs.](https://threejs.org/docs/#api/en/cameras/PerspectiveCamera.filmOffset) */
	export let filmOffset: number = undefined
	$: if (!matrix && camera && filmOffset !== undefined) set_filmOffset()
	function set_filmOffset(): void {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "filmOffset", filmOffset))
		camera.filmOffset = filmOffset
		update_projection_matrix.status = true
	}

	/** Object distance used for stereoscopy and depth-of-field effects. This parameter does not influence the projection matrix unless a [`StereoCamera`](https://threejs.org/docs/#api/en/cameras/StereoCamera) is being used. Default is `10`.
	 * [See threejs-docs.](https://threejs.org/docs/#api/en/cameras/PerspectiveCamera.focus) */
	export let focus: number = undefined
	$: if (!matrix && camera && focus !== undefined) set_focus()
	function set_focus(): void {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "focus", focus))
		camera.focus = focus
		update_projection_matrix.status = true
	}

	/** Camera frustum vertical field of view, from bottom to top of view, in degrees. Default is `50`.
	 * [See threejs-docs.](https://threejs.org/docs/#api/en/cameras/PerspectiveCamera.fov) */
	export let fov: number = undefined
	$: if (!matrix && camera && fov !== undefined) set_fov()
	function set_fov(): void {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "fov", fov))
		camera.fov = fov
		update_projection_matrix.status = true
	}

	/** Camera frustum near plane. Default is `0.1`.
	 * [See threejs-docs.](https://threejs.org/docs/#api/en/cameras/PerspectiveCamera.near) */
	export let near: number = undefined
	$: if (!matrix && camera && near !== undefined) set_near()
	function set_near(): void {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "near", near))
		camera.near = near
		update_projection_matrix.status = true
	}

	/** Frustum window specification or `null`. This is set using the `.setViewOffset` method and cleared using `.clearViewOffset`.
	 * [See threejs-docs.](https://threejs.org/docs/#api/en/cameras/PerspectiveCamera.view) */
	export let view: PerspectiveCamera["view"] = undefined
	$: if (!matrix && camera && view) set_view()
	function set_view(): void {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "view", view))
		camera.view = view
		update_projection_matrix.status = true
	}

	/** Gets or sets the zoom factor of the camera. Default is `1`.
	 * [See threejs-docs.](https://threejs.org/docs/#api/en/cameras/PerspectiveCamera.zoom) */
	export let zoom: number = undefined
	$: if (!matrix && camera && zoom !== undefined) set_zoom()
	function set_zoom(): void {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "zoom", zoom))
		camera.zoom = zoom
		update_projection_matrix.status = true
	}

	// IMPORTANT  `matrix` 'shorthand' attribute will override all other transforms ('shorthand' attributes)!
	$: if (matrix && camera) set_matrix()
	function set_matrix(): void {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "matrix", matrix))
		PropUtils.setMatrixFromValue(camera, matrix)
	}

	// no 'params' -> CameraHelper takes only a cam instance as a parameter.
	/** Creates and adds a `CameraHelper` (_no `helperParams`_). */
	export let helper: boolean = undefined

	$: camera && !camera.userData.helper && helper === true ? add_helper() : null
	$: camera && camera.userData.helper && !helper ? remove_helper() : null

	function add_helper(): void {
		camera.userData.helper = new CameraHelper(camera)
		scene.add(camera.userData.helper)
	}

	function remove_helper(): void {
		if (camera.userData.helper?.parent) {
			camera.userData.helper.parent.remove(camera.userData.helper)
			camera.userData.helper = null
		}
	}

	/** Animation logic to be performed with the (three) object instance created by the component. */
	export let animation: SvelthreeAnimationFunction = undefined

	let animationEnabled: boolean = false
	$: if (animation) animationEnabled = true

	/** Immediately start provided animation, default: `false`. Alternative: `<component_reference>.start_animation()` or shorter `.start_ani()`. */
	export let aniauto: boolean = undefined

	let ani: SvelthreeAnimation
	$: if (animation && animationEnabled) ani = new SvelthreeAnimation(scene, camera, animation, aniauto)

	let currentSceneActive = undefined
	$: currentSceneActive = $svelthreeStores[sti].scenes[scene.userData.index_in_scenes]?.isActive
	$: if (ani && currentSceneActive !== undefined) ani.onCurrentSceneActiveChange(currentSceneActive)

	/** The root scene -> `scene.parent = null`. */
	let root_scene: Scene | null = undefined
	$: if (root_scene === undefined) root_scene = get_root_scene(getContext("scene"))

	$: if (camera && root_scene) {
		camera.userData.root_scene = root_scene
	}

	/** Removes the (three) instance of the object created by the component from it's parent. */
	export const remove_instance_from_parent = (): void => {
		if (camera.parent) camera.parent.remove(camera)
	}
	/**
	 * Same as `remove_instance_from_parent()` just shorter syntax.
	 * Removes the (three) instance of the object created by the component from it's parent.
	 */
	export const remove = remove_instance_from_parent

	/** Returns the (three) instance of the object created by the component. */
	export const get_instance = (): PerspectiveCamera => camera

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
							...c_mau(c_name, "onMount : camera.", {
								matrixAutoUpdate: camera.matrixAutoUpdate,
								matrixWorldNeedsUpdate: camera.matrixWorldNeedsUpdate
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
							...c_mau(c_name, "onDestroy : camera.", {
								matrixAutoUpdate: camera.matrixAutoUpdate,
								matrixWorldNeedsUpdate: camera.matrixWorldNeedsUpdate
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
							...c_mau(c_name, "beforeUpdate : camera.", {
								matrixAutoUpdate: camera.matrixAutoUpdate,
								matrixWorldNeedsUpdate: camera.matrixWorldNeedsUpdate
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
							...c_mau(c_name, "afterUpdate : camera.", {
								matrixAutoUpdate: camera.matrixAutoUpdate,
								matrixWorldNeedsUpdate: camera.matrixWorldNeedsUpdate
							})
						)
					}

					if (afterUpdate_inject_before) afterUpdate_inject_before()

					// Update local matrix after all (props) changes (async microtasks) have been applied.
					if (!camera.matrixAutoUpdate) camera.updateMatrix()

					if (update_projection_matrix.status === true) {
						update_projection_matrix.status = false
						camera.updateProjectionMatrix()
					}

					if (verbose && !camera.matrixAutoUpdate && log_mau) {
						console.debug(
							...c_mau(c_name, "afterUpdate : camera.", {
								matrixAutoUpdate: camera.matrixAutoUpdate,
								matrixWorldNeedsUpdate: camera.matrixWorldNeedsUpdate
							})
						)
					}

					if (helper && camera.userData.helper) camera.userData.helper.update()

					if ($svelthreeStores[sti].rendererComponent?.mode === "auto") {
						root_scene.userData.dirty = true
						$svelthreeStores[sti].rendererComponent.schedule_render_auto(root_scene)
					}

					if (afterUpdate_inject_after) afterUpdate_inject_after()
			  }
	)
</script>

<slot />
