<!--
`accessors:true` hast to be set per component because of the svelte-language-server bug, otherwise accessors would be falsely detected as missing and highlighted as errors.
svelthree uses svelte-accmod, where accessors are always `true`, regardless of `svelte:options`.  
-->
<svelte:options accessors />

<!--
@component
**svelthree** _OrthographicCamera_ Component.

☝️ In order to configure / update the [OrthographicCamera]((https://threejs.org/docs/#api/en/cameras/OrthographicCamera)), you should use one of these approaches **without mixing them**: 
- [ *recommended* ] Set `frustumSize` to some value (alternatively set `aspect:boolean` to `true`) and use `props` attributes : This way the frustum planes positions will be calculated automatically so the camera always fits the canvas size. 
If you use this approach you'll see a warning in the console if you define left, right, top and bottom properties inside `props` attribute. 
- Use `params` attribute to initialize the camera and `props` attribute to set it's properties. 
- Use `props` attribute only: Camera will be initialized with default constructor values and `props` attribute will set it's properties. 
[ tbd ]  Link to Docs. -->
<script context="module" lang="ts">
	/** For typed objects being set as `props` 'shorthand' attribute values, e.g.:
	 * ```
	 * const my_init_props: OrthographicCameraProps = {...}
	 * component_ref.props = my_init_props
	 * ```
	 * */
	export type OrthographicCameraProps = OnlyWritableNonFunctionPropsPlus<
		Omit<OrthographicCamera, PropBlackList>,
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
</script>

<script lang="ts">
	import type { Scene } from "three"

	import { beforeUpdate, onMount, afterUpdate, onDestroy, getContext, setContext } from "svelte"
	import { get_current_component } from "svelte/internal"
	import { self as _self } from "svelte/internal"
	import { c_rs, c_lc, c_mau, c_dev, verbose_mode, get_comp_name } from "../utils/SvelthreeLogger"
	import type { LogLC, LogDEV } from "../utils/SvelthreeLogger"
	import type { OnlyWritableNonFunctionPropsPlus, PropBlackList } from "../types-extra"
	import type { Euler, Matrix4, Object3D, Quaternion, Vector3 } from "three"

	import { svelthreeStores } from "svelthree/stores"
	import { PropUtils, SvelthreeProps } from "../utils"

	import { SvelthreeAnimation } from "../ani"
	import type { SvelthreeAnimationFunction, SvelthreeAnimationFunctionReturn } from "../types-extra"
	import type { Writable } from "svelte/store"

	import { OrthographicCamera, CameraHelper } from "three"
	import { CameraUtils } from "../utils"
	import { CameraValues } from "../constants"

	const self = get_current_component()
	const c_name = get_comp_name(self)

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
		console.warn(
			"SVELTHREE > OrthographicCamera : you have to provide an 'id' prop (not empty String) for Cameras in order to assign them to a 'WebGLRenderer' component!",
			{ id: id }
		)
		throw new Error("SVELTHREE Exception (see warning above)")
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

	/** Returns the `camera` instance created by the component & allows providing (_injection_) of (_already created / premade_) `THREE.OrthographicCamera` instances. */
	export let camera: OrthographicCamera = undefined
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
		if (camera.type === "OrthographicCamera") {
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
		} else {
			throw new Error(
				`SVELTHREE > OrthographicCamera Error: provided 'camera' instance has wrong type '${camera.type}', should be 'OrthographicCamera'!`
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
	// GENERATOR REMARK: 'reactive_re_creation_logic' not implemented for 'OrthographicCamera'!

	/** Alternative to setting `frustumSize = { 1 }`. Setting `aspect:boolean` (e.g. `aspect = { true }` or just adding `aspect`) will internally set `frustumSize = 1 ` resulting in **reactive aspect updates** on canvas dimensions change. */
	export let aspect: boolean = undefined

	/**
    * Setting `frustumSize` to some value (e.g. `frustumSize = { 1 }`) activates **reactive calculation** of `left`, `right`, `top` and `bottom` frustum planes -> rendered result / camera will have always the _correct_ aspect ratio:
    * ```
       camera.left = (frustumSize * aspect) / -2
       camera.right = (frustumSize * aspect) / 2
       camera.top = frustumSize / 2
       camera.bottom = frustumSize / -2
    * ```
    * The value of `aspect` is being reactively calculated based on current dimensions of the Canvas component (canvas.w / canvas.h).
	* **svelthree** sets `frustumSize` to `1` internally on component intialization, so the newly created `OrthographicCamera` will always have the _correct_ ratio, but **it will not be reactive**.
	* You have to set the `frustumSize` shorthand attribute if you e.g. intend to change the canvas size 'on-the-fly' and want to reactively keep the correct aspect ratio.
   */
	export let frustumSize: number = undefined
	$: if (aspect === true) frustumSize = 1

	const defaultParams: ConstructorParameters<typeof OrthographicCamera> =
		CameraUtils.getOrthoCamDefaultParams(frustumSize)

	/**
	 * Initializes the OrthographicCamera with user provided three.js-native [OrthographicCamera](https://threejs.org/docs/#api/en/cameras/OrthographicCamera) constructor parameters.
	 *
	 * Usage:`params={[...]}`
	 *
	 * ☝️ *This is an alternative to using the `frustumSize` attribute, so you'll have to manage the frustum plane positions by yourself.*
	 */
	export let params: ConstructorParameters<typeof OrthographicCamera> = undefined

	$: if (!camera && create) {
		if (params) {
			camera = new OrthographicCamera(...params)
		} else {
			// we're using our own default parameters here (frustumSize)
			camera = new OrthographicCamera(...defaultParams)
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
	$: if (
		camera &&
		((camera_uuid && camera_uuid !== camera.uuid) || (camera.parent !== our_parent && camera !== our_parent))
	)
		add_instance_to()

	function add_instance_to(): void {
		//let replacing = false

		// if 'camera' was already created or set via 'camera' attribute before
		if (camera_uuid && camera.uuid !== camera_uuid) {
			// remove old instance and update references where needed

			const old_instance: Object3D = scene.getObjectByProperty("uuid", camera_uuid)

			// update 'index_in_x'

			/*
if ($svelthreeStores[sti].cameras.indexOf(old_instance) !== index_in_cameras) {
	index_in_cameras = $svelthreeStores[sti].cameras.indexOf(old_instance)
}
*/
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

				// tells renderer to update the 'currentCam' instance (on-the-fly), see 'WebGLRenderer.renderStandard()'.
				old_instance.userData.renderer_currentcam_needsupdate = true
			}

			// recreate 'SvelthreeProps'
			// - all initially set props will be applied to the new instance.
			// - 'props' attribute can be used directly after camera reassignment.
			sProps = new SvelthreeProps(camera)

			// helpers will be recreated automatically
			// (see corresponding reactive statement -> !camera.userData.helper)
		}

		// add `camera` to `our_parent`
		if (our_parent) {
			// TODO  UNDERSTAND completely why we need the `camera !== our_parent` check (was added as quick-fix)
			// TODO  Update - we changed the approach, still needed?
			if (camera.parent !== our_parent && camera !== our_parent) {
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
				// TODO / TOFIX  why is this happening if `!replacing`?
				//if (!replacing) console.warn(`camera was already added to the ${get_comp_name(our_parent)}`, {camera, our_parent, scene})
			}
		} else {
			console.error("No 'our_parent' (or 'scene')! Nothing to add 'camera' to!", { camera, our_parent, scene })
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

	// IMPORTANT  `props` will be overridden by 'shorthand' attributes!
	/** **shorthand** attribute for setting properties using key-value pairs in an `Object`. */
	export let props: { [P in keyof OrthographicCameraProps]: OrthographicCameraProps[P] } = undefined

	$: if (!sProps && camera && props) sProps = new SvelthreeProps(camera)
	$: if (props && sProps) update_props()
	function update_props() {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "props", props))
		sProps.update(props)
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

	let camera_updated_on_init: boolean = false

	// update frustum planes / aspect on initialization only (`frustumSize` not set -> svelthree default value in order prevent 'stretching')
	$: if (!frustumSize && !camera_updated_on_init && camera && $canvas_dom.element && $canvas_dim.w && $canvas_dim.h) {
		camera_updated_on_init = true
		CameraUtils.updateOtrhoCam(camera, CameraValues.CAM_ORTHO_FRUSTUM_SIZE, $canvas_dim.w, $canvas_dim.h)
	}

	// update frustum planes / aspect if `frustumSize` is set or has automatically set to `1` by `aspect = true`
	$: if (frustumSize && camera && $canvas_dom.element && $canvas_dim.w && $canvas_dim.h) {
		CameraUtils.updateOtrhoCam(camera, frustumSize, $canvas_dim.w, $canvas_dim.h)
	}

	/** Camera frustum far plane. Default is `2000`.
	 * [See threejs-docs.](https://threejs.org/docs/#api/en/cameras/OrthographicCamera.far) */
	export let far: number = undefined
	$: if (!matrix && camera && far !== undefined) set_far()
	function set_far(): void {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "far", far))
		camera.far = far
	}

	/** Camera frustum near plane. Default is `0.1`.
	 * [See threejs-docs.](https://threejs.org/docs/#api/en/cameras/OrthographicCamera.near) */
	export let near: number = undefined
	$: if (!matrix && camera && near !== undefined) set_near()
	function set_near(): void {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "near", near))
		camera.near = near
	}

	/** Frustum window specification or `null`. This is set using the `.setViewOffset` method and cleared using `.clearViewOffset`.
	 * [See threejs-docs.](https://threejs.org/docs/#api/en/cameras/OrthographicCamera.view) */
	export let view: OrthographicCamera["view"] = undefined
	$: if (!matrix && camera && view) set_view()
	function set_view(): void {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "view", view))
		camera.view = view
	}

	/** Gets or sets the zoom factor of the camera. Default is `1`.
	 * [See threejs-docs.](https://threejs.org/docs/#api/en/cameras/OrthographicCamera.zoom) */
	export let zoom: number = undefined
	$: if (!matrix && camera && zoom !== undefined) set_zoom()
	function set_zoom(): void {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "zoom", zoom))
		camera.zoom = zoom
	}

	// IMPORTANT  `matrix` 'shorthand' attribute will override all other transforms ('shorthand' attributes)!
	$: if (matrix && camera) set_matrix()
	function set_matrix(): void {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "matrix", matrix))
		PropUtils.setMatrixFromValue(camera, matrix)
	}

	// no 'params' -> CameraHelper takes only a cam instance as a parameter.
	/** Creates and adds a  `CameraHelper` (_no `helperParams`_). */
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
	export const get_instance = (): OrthographicCamera => camera

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

					if (verbose && !camera.matrixAutoUpdate && log_mau) {
						console.debug(
							...c_mau(c_name, "afterUpdate : camera.", {
								matrixAutoUpdate: camera.matrixAutoUpdate,
								matrixWorldNeedsUpdate: camera.matrixWorldNeedsUpdate
							})
						)
					}

					if (helper && camera.userData.helper) camera.userData.helper.update()

					if (afterUpdate_inject_after) afterUpdate_inject_after()
			  }
	)
</script>

<!-- using context -->
<slot />
