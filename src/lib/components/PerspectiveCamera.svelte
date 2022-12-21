<!--
@component
**svelthree** _PerspectiveCamera_ Component.
[ tbd ]  Link to Docs.
-->
<script context="module" lang="ts">
	type CurrentComponentType = import("./PerspectiveCamera.svelte").default

	export interface IStatePerspectiveCamera {
		readonly log_all: boolean
		readonly log_dev: { [P in keyof LogDEV]: LogDEV[P] } | undefined
		readonly log_rs: boolean
		readonly log_lc: { [P in keyof LogLC]: LogLC[P] } | undefined
		readonly log_mau: boolean
		readonly id: string | undefined
		readonly camera: THREE_PerspectiveCamera | undefined | null
		readonly name: string | undefined
		readonly params: ConstructorParameters<typeof THREE_PerspectiveCamera> | undefined
		readonly tabindex: number | undefined
		readonly aria: Partial<ARIAMixin> | undefined
		readonly mau: boolean | undefined
		readonly matrix: Matrix4 | Parameters<Matrix4["set"]> | undefined
		readonly props: PropsPerspectiveCamera | undefined
		readonly pos: Vector3 | Parameters<Vector3["set"]> | undefined
		readonly rot:
			| Euler
			| Parameters<Euler["set"]>
			| Quaternion
			| Parameters<Quaternion["set"]>
			| Vector3
			| Parameters<Vector3["set"]>
			| undefined
		readonly quat: Quaternion | Parameters<Quaternion["set"]> | undefined
		readonly scale: Vector3 | Parameters<Vector3["set"]> | number | undefined
		readonly lookAt: Vector3 | Parameters<Vector3["set"]> | Targetable | undefined | null
		readonly aspect: number | boolean | undefined
		readonly far: number | undefined
		readonly filmGauge: number | undefined
		readonly filmOffset: number | undefined
		readonly focus: number | undefined
		readonly fov: number | undefined
		readonly near: number | undefined
		readonly view: THREE_PerspectiveCamera["view"] | undefined
		readonly zoom: number | undefined
		readonly helper: boolean | undefined
		readonly animation: SvelthreeAnimationFunction | undefined
		readonly aniauto: boolean | undefined
		readonly onMountReplace: SvelthreeLifecycleCallback<CurrentComponentType> | undefined
		readonly onDestroyStart: SvelthreeLifecycleCallback<CurrentComponentType> | undefined
		readonly onDestroyEnd: SvelthreeLifecycleCallback<CurrentComponentType> | undefined
		readonly onDestroyReplace: SvelthreeLifecycleCallback<CurrentComponentType> | undefined
		readonly beforeUpdateReplace: SvelthreeLifecycleCallback<CurrentComponentType> | undefined
		readonly afterUpdateStart: SvelthreeLifecycleCallback<CurrentComponentType> | undefined
		readonly afterUpdateEnd: SvelthreeLifecycleCallback<CurrentComponentType> | undefined
		readonly afterUpdateReplace: SvelthreeLifecycleCallback<CurrentComponentType> | undefined
	}
</script>

<script lang="ts">
	import type { Scene } from "three"

	import { beforeUpdate, onMount, afterUpdate, onDestroy, getContext, setContext, tick } from "svelte"
	import { get_current_component } from "svelte/internal"
	import { c_rs, c_lc, c_mau, c_dev, verbose_mode, get_comp_name } from "../utils/SvelthreeLogger.js"
	import type { LogLC, LogDEV } from "../utils/SvelthreeLogger.js"
	import type { SvelthreeLifecycleCallback } from "../types/types-extra.js"
	import type { SvelthreeShadowDOMElement } from "../types/types-extra.js"
	import { if$_instance_change } from "../logic/if$/index.js"
	import {
		remove_instance,
		recreate_shadow_dom_el,
		set_initial_userdata,
		find_in_canvas
	} from "../logic/shared/index.js"

	import type { Euler, Matrix4, Quaternion, Vector3 } from "three"
	import type { Object3D } from "three"
	import type { Targetable } from "../types/types-extra.js"

	import { svelthreeStores } from "../stores/index.js"
	import { PropUtils, SvelthreeProps } from "../utils/index.js"

	import { SvelthreeAni } from "../ani/index.js"
	import type { SvelthreeAnimationFunction, SvelthreeAnimation } from "../types/types-extra.js"

	import { PerspectiveCamera as THREE_PerspectiveCamera } from "three"
	import { CameraHelper } from "three"
	import type { PropsPerspectiveCamera } from "../types/types-comp-props.js"
	import { get_root_scene } from "../utils/SceneUtils.js"
	import { CAM_PROPS_PMU } from "../constants/Cameras.js"
	import type { StoreBody } from "../types/types-extra.js"
	import type { Writable } from "svelte/store"

	/**
	 *  SVELTEKIT  CSR ONLY /
	 * Atm, all logic using 'document' or 'window' is wrapped in an 'if (browser)' check,
	 * and should run on CLIENT ONLY.
	 */
	const browser = !import.meta.env.SSR

	const self = get_current_component()
	const c_name = get_comp_name(self)
	/** svelthree component's type (e.g. `type` prop value of component `Foo` will be `'Foo'`) */
	export const type: string = c_name

	const verbose: boolean = verbose_mode()

	export let log_all = false
	export let log_dev: { [P in keyof LogDEV]: LogDEV[P] } | undefined = log_all ? { all: true } : undefined
	export let log_rs: boolean = log_all
	export let log_lc: { [P in keyof LogLC]: LogLC[P] } | undefined = log_all ? { all: true } : undefined
	export let log_mau: boolean = log_all

	// TODO  CHECK THIS COMMENT: Add ability to add Camera to an Interaction-Dummy (Mesh) like with Lights
	// TODO  CHECK usage with Orbitcontrols!

	/** `id` is used to internally identify / assign a Camera to a 'WebGLRenderer' component. */
	export let id: string | undefined = undefined

	if (!id) {
		throw new Error(
			"SVELTHREE > PerspectiveCamera : you have to provide an 'id' prop (not empty String) for Cameras in order to assign them to a 'WebGLRenderer' component!"
		)
	}

	let scene: Scene = getContext("scene")
	const sti: number = getContext("store_index")
	const store = $svelthreeStores[sti]

	/** [ **feature**: allow providing (_injection_) of (_already created_) threejs object instances ].
	 * `create` is an internal indicator for how the component's corresponding threejs object instance has to be / has been created.
	 * It's being set to `false` on initialization if an (_already created_) threejs object instance was provided,
	 * otherwise it's set to `true`, means a new threejs object instance will be created. */
	let create = false

	/** The (three) instance that was shared to this component as it's 'parent' which can be either another instance / object or a scene / root scene. */
	let our_parent: Object3D | undefined = undefined

	/** Shadow DOM element generated by our parent scene / root scene. Used as fallback if this component has no non-`Scene` component as parent. */
	let scene_shadow_dom_el: SvelthreeShadowDOMElement = getContext("scene_shadow_dom_el")

	/** Shadow DOM element generated by our parent component (_not `Canvas`_) shared with this component (child) via context.
	Fallback is `scene_shadow_dom_el` or `shadow_root_el` in case of the `Scene` component. */
	let our_parent_shadow_dom_el: SvelthreeShadowDOMElement | undefined = undefined

	/** Shadow DOM element generated by this component. Shared by this component (as parent) to it's children via context as "parent_shadow_dom_el". */
	let shadow_dom_el: SvelthreeShadowDOMElement | undefined | null = undefined
	export const get_shadow_dom_el = (): SvelthreeShadowDOMElement | undefined | null => shadow_dom_el

	/** Returns the `camera` instance created by the component & allows providing (_injection_) of (_already created / premade_) `THREE.PerspectiveCamera` instances. */
	export let camera: THREE_PerspectiveCamera | undefined | null = undefined
	let camera_uuid: string | undefined | null = undefined

	/** Sets the `name` property of the created / injected three.js instance. */
	export let name: string | undefined = undefined
	let camera_is_active: boolean | undefined = undefined
	let index_in_cameras: number | undefined = undefined

	export const is_svelthree_component = true
	export const is_svelthree_camera = true

	//  ONCE  ON  INITIALIZATION  //

	if (camera) {
		create = false
		on_instance_provided()
	} else {
		create = true
	}

	//  INJECTION  ONCE  ON  INITIALIZATION  //

	/** Executed when / if an instance was provided **on initializiation** -> only once if at all! */
	function on_instance_provided(): void {
		if (store) {
			if (camera?.type === "PerspectiveCamera") {
				camera.userData.id = id

				camera_is_active = false
				camera.userData.isActive = camera_is_active

				store.cameras.push({
					camera: camera,
					id: id,
					isActive: camera_is_active
				})

				index_in_cameras = camera.userData.index_in_cameras
			} else if (camera) {
				throw new Error(
					`SVELTHREE > ${c_name} : provided 'camera' instance has wrong type '${camera.type}', should be '${c_name}'!`
				)
			}
		} else {
			console.error(`SVELTHREE > ${c_name} > on_instance_provided : invalid 'store' instance value!`, { store })
			throw new Error(
				`SVELTHREE > ${c_name} : Cannot process provided 'camera' instance, invalid 'store' value!'`
			)
		}
	}

	//  INJECTION  ONCE  ON  INITIALIZATION  //

	if (!create) {
		// get the instance that was shared to us as our 'parent' or use fallback.

		our_parent = getContext("parent") || scene
		// get the shadow DOM element that was shared to us by our parent component or use fallback.

		our_parent_shadow_dom_el = getContext("parent_shadow_dom_el") || scene_shadow_dom_el

		// share created object (three) instance to all children (slots) as 'parent'.
		setContext("parent", camera)

		// SVELTEKIT  CSR ONLY /
		if (browser) create_shadow_dom()
	}

	/** Initializes `PerspectiveCamera` with provided constructor parameters.*/
	export let params: ConstructorParameters<typeof THREE_PerspectiveCamera> | undefined = undefined

	$: if (!camera && create && store) {
		if (params) {
			camera = new THREE_PerspectiveCamera(...params)
		} else {
			camera = new THREE_PerspectiveCamera()
		}

		set_initial_userdata(camera, self)

		camera.userData.id = id

		camera_is_active = false
		camera.userData.isActive = camera_is_active

		store.cameras.push({
			camera: camera,
			id: id,
			isActive: camera_is_active
		})

		index_in_cameras = camera.userData.index_in_cameras

		if (verbose && log_dev) console.debug(...c_dev(c_name, `${camera.type} created!`, { camera }))
	}

	// ---  AFTER  INITIALIZATION  --- //

	// set camera_uuid the first time
	$: if (camera && camera_uuid === undefined) set_uuid()

	function set_uuid(): void {
		camera_uuid = camera?.uuid
	}

	// GENERATOR REMARK: 'reactive_re_creation_logic' not implemented for 'PerspectiveCamera'!

	// Determining 'parent' if 'camera' instance has to be created first / was not provided on initialization ('create' is true).
	$: if (camera && create && scene && !our_parent) set_parent()

	function set_parent() {
		// get the instance that was shared to us as our 'parent' or use fallback.

		our_parent = getContext("parent") || scene

		// share created object (three) instance to all children (slots) as 'parent'.
		setContext("parent", camera)
	}

	//  IMPORTANT  TODO
	// - see https://github.com/vatro/svelthree/issues/114
	// - see https://github.com/vatro/svelthree/issues/103

	$: if (camera && create && our_parent_shadow_dom_el === undefined) {
		our_parent_shadow_dom_el = getContext("parent_shadow_dom_el") || scene_shadow_dom_el
	}

	//  IMPORTANT  TODO
	// - see https://github.com/vatro/svelthree/issues/114
	// - see https://github.com/vatro/svelthree/issues/103

	$: if (our_parent_shadow_dom_el !== undefined) {
		// SVELTEKIT  CSR ONLY /
		if (browser) create_shadow_dom()
	}

	function create_shadow_dom(): void {
		// create / recreate and share our own shadow_dom_el as parent_shadow_dom_el
		shadow_dom_el = recreate_shadow_dom_el(shadow_dom_el, our_parent_shadow_dom_el, null, null, c_name)

		if (shadow_dom_el) {
			setContext("parent_shadow_dom_el", shadow_dom_el)
		} else {
			if (!shadow_dom_el) console.error(`SVELTHREE > ${c_name} : 'shadow_dom_el' was not created!`, shadow_dom_el)
		}
	}

	// accessability -> shadow dom focusable
	export let tabindex: number | undefined = undefined

	$: if (shadow_dom_el && tabindex !== undefined) {
		shadow_dom_el.tabIndex = tabindex
	}

	// accessability -> shadow dom wai-aria
	export let aria: Partial<ARIAMixin> | undefined = undefined

	$: if (shadow_dom_el && aria !== undefined) {
		for (const key in aria) {
			if (key === "ariaLabel") {
				// add specified `ariaLabel` as text to generated shadow DOM `<div>` element (for better reader support / indexing (?))
				//  TODO  RECONSIDER  needs to be tested more, may be obsolete (?).
				shadow_dom_el.innerText += `${aria[key]}`
			}

			try {
				Object.assign(shadow_dom_el, aria)
			} catch (err) {
				console.error(err)
			}
		}
	}

	// this reactive statement willl be triggered on any 'camera' instance change (also e.g. `camera.foo = value`)
	$: if (camera) if$_instance_change(camera, our_parent, camera_uuid, create, "camera", name, handle_instance_change)

	/** Called from by the `if$_instance_change` logic if needed. */
	function handle_instance_change(): void {
		if (camera) {
			if ((camera_uuid && camera.uuid !== camera_uuid) || !camera_uuid) {
				const uuid_to_remove: string = camera_uuid || camera.uuid
				const old_instance: Object3D | undefined = find_in_canvas(store?.scenes, uuid_to_remove)

				if (old_instance) {
					camera_is_active = old_instance.userData.isActive

					remove_instance(old_instance, "camera", camera, self)

					old_instance.userData.index_in_cameras = null
					old_instance.userData.isActive = null
					old_instance.userData.id = null

					// recreate 'sProps'
					if (props) {
						try {
							sProps = new SvelthreeProps(camera)
						} catch (err) {
							console.error(err)
						}
					}
				} else {
					console.error(
						`SVELTHREE > ${c_name} > handle_instance_change : invalid 'old_instance' instance value!`,
						{ old_instance }
					)
				}
			}

			set_initial_userdata(camera, self)

			if (our_parent) our_parent.add(camera)
			camera_uuid = camera.uuid

			if (index_in_cameras !== undefined && index_in_cameras >= 0) {
				if (store) {
					;($svelthreeStores[sti] as StoreBody).cameras[index_in_cameras].camera = camera
					;($svelthreeStores[sti] as StoreBody).cameras[index_in_cameras].id = id
					;($svelthreeStores[sti] as StoreBody).cameras[index_in_cameras].isActive = camera_is_active

					camera.userData.index_in_cameras = index_in_cameras

					camera.userData.id = id
					camera.userData.isActive = camera_is_active
				} else {
					console.error(
						`SVELTHREE > ${c_name} > handle_instance_change : Cannot process Camera instance change correctly, invalid 'store' prop value!`,
						{ store }
					)
				}
			} else {
				console.error(
					`SVELTHREE > ${c_name} > handle_instance_change : Cannot process Camera instance change correctly, invalid 'index_in_cameras' prop value!`,
					{ index_in_cameras }
				)
			}

			if (verbose && log_dev) {
				console.debug(
					...c_dev(c_name, `${camera.type} was added to ${our_parent?.type}!`, {
						camera,
						scene,
						total: scene?.children.length
					})
				)
			}
		}
	}

	/** Override object's `.matrixAutoUpdate` set (*on initialzation*) by scene's `.matrixAutoUpdate` (*default is `true`*). Also: `mau` can be changed on-the-fly.*/
	export let mau: boolean | undefined = undefined
	$: if (camera) camera.matrixAutoUpdate = scene.matrixAutoUpdate
	$: if (camera && mau !== undefined) camera.matrixAutoUpdate = mau

	$: if (camera && name) camera.name = name
	$: if (shadow_dom_el && name) shadow_dom_el.dataset.name = name

	/** ☝️ `matrix` **shorthand** attribute overrides ( *are ignored* ) `pos`, `rot`, `quat`, `scale` and `lookAt` 'shorthand' attributes! */
	export let matrix: Matrix4 | Parameters<Matrix4["set"]> | undefined = undefined

	const w_sh = PropUtils.getShortHandAttrWarnings(`SVELTHREE > ${c_name} >`)

	let sProps: SvelthreeProps

	/** If `.status` is `true`, camera's projection matrix will be updated on `afterUpdate` (_on change of any of the related props_). */
	let update_projection_matrix = { status: false }

	// IMPORTANT  `props` will be overridden by 'shorthand' attributes!
	/** **shorthand** attribute for setting properties of the created / injected three.js instance via an `Object Literal`. */
	export let props: PropsPerspectiveCamera | undefined = undefined

	$: if (!sProps && camera && props) sProps = new SvelthreeProps(camera)
	$: if (props && sProps) update_props()
	function update_props() {
		if (props) {
			if (verbose && log_rs) console.debug(...c_rs(c_name, "props", props))

			const updated_keys: string[] = sProps.update(props)
			if (updated_keys_need_pmu(updated_keys)) {
				update_projection_matrix.status = true
			}
		}
	}

	function updated_keys_need_pmu(updated_keys: string[]): boolean {
		for (let i = 0; i < updated_keys.length; i++) {
			if (CAM_PROPS_PMU.has(updated_keys[i])) return true
		}
		return false
	}

	// IMPORTANT  following 'shorthand' attributes will override `props` attribute!

	/** **shorthand** attribute for setting the `position` property of the created / injected three.js instance. */
	export let pos: Vector3 | Parameters<Vector3["set"]> | undefined = undefined
	$: !matrix && camera && pos ? set_pos() : pos && camera ? console.warn(w_sh.pos) : null
	function set_pos() {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "pos", pos))

		if (camera && pos) {
			PropUtils.setPositionFromValue(camera, pos)
		} else {
			console.error(`SVELTHREE > ${c_name} > set_pos : invalid 'camera' instance and / or 'pos' value!`, {
				camera,
				pos
			})
		}
	}

	/** **shorthand** attribute for setting the `rotation` property of the created / injected three.js instance. */
	export let rot:
		| Euler
		| Parameters<Euler["set"]>
		| Quaternion
		| Parameters<Quaternion["set"]>
		| Vector3
		| Parameters<Vector3["set"]>
		| undefined = undefined
	$: !matrix && !quat && camera && rot ? set_rot() : rot && camera ? console.warn(w_sh.rot) : null
	function set_rot() {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "rot", rot))

		if (camera && rot !== undefined) {
			PropUtils.setRotationFromValue(camera, rot)
		} else {
			console.error(`SVELTHREE > ${c_name} > set_rot : invalid 'camera' instance and / or 'rot' value!`, {
				camera,
				rot
			})
		}
	}

	/** **shorthand** attribute for setting the `quaternion` property of the created / injected three.js instance. */
	export let quat: Quaternion | Parameters<Quaternion["set"]> | undefined = undefined
	$: !matrix && camera && quat ? set_quat() : quat && camera ? console.warn(w_sh.quat) : null
	function set_quat() {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "quat", quat))

		if (camera && quat) {
			PropUtils.setQuaternionFromValue(camera, quat)
		} else {
			console.error(`SVELTHREE > ${c_name} > set_quat : invalid 'camera' instance and / or 'quat' value!`, {
				camera,
				quat
			})
		}
	}

	export let scale: Vector3 | Parameters<Vector3["set"]> | number | undefined = undefined
	$: !matrix && camera && scale ? set_scale() : scale && camera ? console.warn(w_sh.scale) : null
	function set_scale() {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "scale", scale))

		if (camera && scale !== undefined) {
			PropUtils.setScaleFromValue(camera, scale)
		} else {
			console.error(`SVELTHREE > ${c_name} > set_scale : invalid 'camera' instance and / or 'scale' value!`, {
				camera,
				scale
			})
		}
	}

	/** **shorthand** attribute for calling the `svelthree`-custom `lookAt` method with the provided value as argument. */
	export let lookAt: Vector3 | Parameters<Vector3["set"]> | Targetable | undefined | null = undefined
	$: !matrix && camera && lookAt ? set_lookat() : lookAt && camera ? console.warn(w_sh.lookAt) : null
	function set_lookat() {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "lookAt", lookAt))
		if (camera && lookAt) {
			PropUtils.setLookAtFromValue(camera, lookAt)
		} else {
			console.error(`SVELTHREE > ${c_name} > set_lookat : invalid 'camera' instance and / or 'lookAt' value!`, {
				camera,
				lookAt
			})
		}
	}

	const canvas_dom: Writable<{ element: HTMLCanvasElement }> = getContext("canvas_dom")

	const canvas_dim: Writable<{ w: number; h: number }> = getContext("canvas_dim")

	let aspect_updated_on_init = false

	/** Camera frustum aspect ratio, usually the `canvas width / canvas height`.
	 * **svelthree** always sets the aspect of the camera automatically _once_ on initialization to match canvas dimensions.
	 * ☝️ Setting `aspect:boolean` (e.g. `aspect = { true }` or just adding `aspect`) will result in **reactive aspect updates** on canvas dimensions change. */
	export let aspect: number | boolean | undefined = undefined

	// update aspect on init once if no aspect is set by the user
	$: if (!matrix && aspect === undefined && !aspect_updated_on_init && camera && $canvas_dom.element && $canvas_dim) {
		set_aspect_on_init()
	}

	function set_aspect_on_init() {
		if (camera) {
			aspect_updated_on_init = true
			camera.aspect = calc_aspect()
			camera.updateProjectionMatrix()

			if (verbose && log_rs) console.debug(...c_rs(c_name, "aspect (on init, no aspect)", camera.aspect))
		} else {
			console.error(`SVELTHREE > ${c_name} > set_aspect_on_init : invalid 'camera' instance value!`, { camera })
		}
	}

	// update aspect as a number value
	$: if (!matrix && camera && typeof aspect === "number") set_aspect_as_num()

	function set_aspect_as_num() {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "aspect", aspect))

		if (camera) {
			camera.aspect = aspect as number
			camera.updateProjectionMatrix()
		} else {
			console.error(`SVELTHREE > ${c_name} > set_aspect_as_num : invalid 'camera' instance value!`, { camera })
		}
	}

	// auto update aspect on canvas dimensions change
	$: if (!matrix && aspect === true && camera && $canvas_dom.element && $canvas_dim) autoupdate_aspect()

	function autoupdate_aspect() {
		if (camera) {
			camera.aspect = calc_aspect()
			camera.updateProjectionMatrix()
			if (verbose && log_rs) console.debug(...c_rs(c_name, "aspect auto update", camera.aspect))
		} else {
			console.error(`SVELTHREE > ${c_name} > autoupdate_aspect : invalid 'camera' instance value!`, { camera })
		}
	}

	function calc_aspect(): number {
		//return canvasW / canvasH
		return $canvas_dim.w / $canvas_dim.h
	}

	/** Camera frustum far plane. Default is `2000`.
	 * [See threejs-docs.](https://threejs.org/docs/#api/en/cameras/PerspectiveCamera.far) */
	export let far: number | undefined = undefined
	$: if (!matrix && camera && far !== undefined) set_far()
	function set_far(): void {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "far", far))
		if (camera && far !== undefined) {
			camera.far = far
			update_projection_matrix.status = true
		} else {
			console.error(`SVELTHREE > ${c_name} > set_far : invalid 'camera' instance and / or 'far' value!`, {
				camera,
				far
			})
		}
	}

	/** Film size used for the larger axis. Default is `35` (millimeters). This parameter does not influence the projection matrix unless `.filmOffset` is set to a `nonzero` value.
	 * [See threejs-docs.](https://threejs.org/docs/#api/en/cameras/PerspectiveCamera.filmGauge) */
	export let filmGauge: number | undefined = undefined
	$: if (!matrix && camera && filmGauge !== undefined) set_filmGauge()
	function set_filmGauge(): void {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "filmGauge", filmGauge))
		if (camera && filmGauge !== undefined) {
			camera.filmGauge = filmGauge
			update_projection_matrix.status = true
		} else {
			console.error(
				`SVELTHREE > ${c_name} > set_filmGauge : invalid 'camera' instance and / or 'filmGauge' value!`,
				{ camera, filmGauge }
			)
		}
	}

	/** Horizontal off-center offset in the same unit as `.filmGauge`. Default is `0`.
	 * [See threejs-docs.](https://threejs.org/docs/#api/en/cameras/PerspectiveCamera.filmOffset) */
	export let filmOffset: number | undefined = undefined
	$: if (!matrix && camera && filmOffset !== undefined) set_filmOffset()
	function set_filmOffset(): void {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "filmOffset", filmOffset))
		if (camera && filmOffset !== undefined) {
			camera.filmOffset = filmOffset
			update_projection_matrix.status = true
		} else {
			console.error(
				`SVELTHREE > ${c_name} > set_filmOffset : invalid 'camera' instance and / or 'filmOffset' value!`,
				{ camera, filmOffset }
			)
		}
	}

	/** Object distance used for stereoscopy and depth-of-field effects. This parameter does not influence the projection matrix unless a [`StereoCamera`](https://threejs.org/docs/#api/en/cameras/StereoCamera) is being used. Default is `10`.
	 * [See threejs-docs.](https://threejs.org/docs/#api/en/cameras/PerspectiveCamera.focus) */
	export let focus: number | undefined = undefined
	$: if (!matrix && camera && focus !== undefined) set_focus()
	function set_focus(): void {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "focus", focus))
		if (camera && focus !== undefined) {
			camera.focus = focus
			update_projection_matrix.status = true
		} else {
			console.error(`SVELTHREE > ${c_name} > set_focus : invalid 'camera' instance and / or 'focus' value!`, {
				camera,
				focus
			})
		}
	}

	/** Camera frustum vertical field of view, from bottom to top of view, in degrees. Default is `50`.
	 * [See threejs-docs.](https://threejs.org/docs/#api/en/cameras/PerspectiveCamera.fov) */
	export let fov: number | undefined = undefined
	$: if (!matrix && camera && fov !== undefined) set_fov()
	function set_fov(): void {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "fov", fov))
		if (camera && fov !== undefined) {
			camera.fov = fov
			update_projection_matrix.status = true
		} else {
			console.error(`SVELTHREE > ${c_name} > set_fov : invalid 'camera' instance and / or 'fov' value!`, {
				camera,
				fov
			})
		}
	}

	/** Camera frustum near plane. Default is `0.1`.
	 * [See threejs-docs.](https://threejs.org/docs/#api/en/cameras/PerspectiveCamera.near) */
	export let near: number | undefined = undefined
	$: if (!matrix && camera && near !== undefined) set_near()
	function set_near(): void {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "near", near))
		if (camera && near !== undefined) {
			camera.near = near
			update_projection_matrix.status = true
		} else {
			console.error(`SVELTHREE > ${c_name} > set_near : invalid 'camera' instance and / or 'near' value!`, {
				camera,
				near
			})
		}
	}

	/** Frustum window specification or `null`. This is set using the `.setViewOffset` method and cleared using `.clearViewOffset`.
	 * [See threejs-docs.](https://threejs.org/docs/#api/en/cameras/PerspectiveCamera.view) */
	export let view: THREE_PerspectiveCamera["view"] | undefined = undefined
	$: if (!matrix && camera && view) set_view()
	function set_view(): void {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "view", view))
		if (camera && view !== undefined) {
			camera.view = view
			update_projection_matrix.status = true
		} else {
			console.error(`SVELTHREE > ${c_name} > set_view : invalid 'camera' instance and / or 'view' value!`, {
				camera,
				view
			})
		}
	}

	/** Gets or sets the zoom factor of the camera. Default is `1`.
	 * [See threejs-docs.](https://threejs.org/docs/#api/en/cameras/PerspectiveCamera.zoom) */
	export let zoom: number | undefined = undefined
	$: if (!matrix && camera && zoom !== undefined) set_zoom()
	function set_zoom(): void {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "zoom", zoom))
		if (camera && zoom !== undefined) {
			camera.zoom = zoom
			update_projection_matrix.status = true
		} else {
			console.error(`SVELTHREE > ${c_name} > set_zoom : invalid 'camera' instance and / or 'zoom' value!`, {
				camera,
				zoom
			})
		}
	}

	// IMPORTANT  `matrix` 'shorthand' attribute will override all other transforms ('shorthand' attributes)!
	$: if (matrix && camera) set_matrix()
	function set_matrix(): void {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "matrix", matrix))
		if (camera && matrix) {
			PropUtils.setMatrixFromValue(camera, matrix)
		} else {
			console.error(`SVELTHREE > ${c_name} > set_matrix : invalid 'camera' instance and / or 'matrix' value!`, {
				camera,
				matrix
			})
		}
	}

	// no 'params' -> CameraHelper takes only a cam instance as a parameter.
	/** Creates and adds a `CameraHelper` (_no `helperParams`_). */
	export let helper: boolean | undefined = undefined

	$: camera && helper === true ? add_helper() : null
	$: camera && helper !== undefined && !helper ? remove_helper() : null

	function add_helper(): void {
		if (camera) {
			if (!camera.userData.helper) {
				camera.userData.helper = new CameraHelper(camera)
				if (scene) {
					scene.add(camera.userData.helper)
				} else {
					console.error(
						`SVELTHREE > ${c_name} > add_helper : Couldn't add helper to unavailable 'scene' instance!`,
						{ scene }
					)
				}
			} else {
				console.warn(
					`SVELTHREE > ${c_name} > add_helper : Didn't create new helper, 'camera.userData.helper' instance already available!`,
					{ camera, helper: camera.userData.helper }
				)
			}
		} else {
			console.error(
				`SVELTHREE > ${c_name} > add_helper : Couldn't add helper for unavailable 'camera' instance!`,
				{ camera }
			)
		}
	}

	function remove_helper(): void {
		if (camera) {
			if (camera.userData.helper) {
				if (camera.userData.helper.parent) {
					camera.userData.helper.parent.remove(camera.userData.helper)
					camera.userData.helper = null
				} else {
					console.error(
						`SVELTHREE > ${c_name} > remove_helper : Couldn't remove 'camera.userData.helper' from it's 'parent' (not available)!`,
						{ parent: camera.userData.helper.parent }
					)
				}
			} else {
				// nothing, silent
			}
		} else {
			console.error(
				`SVELTHREE > ${c_name} > remove_helper : Couldn't remove helper for unavailable 'camera' instance!`,
				{ camera }
			)
		}
	}

	/** Animation logic to be performed with the (three) object instance created by the component. */
	export let animation: SvelthreeAnimationFunction | undefined = undefined

	let animationEnabled = false
	$: if (animation) animationEnabled = true

	/** Immediately start provided animation, default: `false`. Alternative: `<component_reference>.start_animation()` or shorter `.start_ani()`. */
	export let aniauto: boolean | undefined = undefined

	/** (_internal_) reference to the `SvelthreeAni` instance */
	let ani: SvelthreeAni
	$: if (animation && animationEnabled) ani = new SvelthreeAni(scene, camera, animation, !!aniauto)

	let currentSceneActive: boolean | undefined = undefined
	$: currentSceneActive = $svelthreeStores[sti]?.scenes[scene?.userData.index_in_scenes]?.isActive
	$: if (ani && currentSceneActive !== undefined) ani.onCurrentSceneActiveChange(currentSceneActive)

	/** The root scene -> `scene.parent = null`. */
	let root_scene: Scene | undefined = undefined
	let root_scene_obj: { value: Scene | undefined } = { value: undefined }

	$: if (root_scene === undefined) {
		root_scene = get_root_scene(getContext("scene"))
		root_scene_obj.value = root_scene
	}

	$: if (camera && root_scene) {
		camera.userData.root_scene = root_scene
	}

	/** Removes the (three) instance created by / provided to the component from it's parent. */
	export const remove_instance_from_parent = async (): Promise<boolean> => {
		if (camera) {
			const removed: boolean = remove_instance(camera, "camera")
			return removed
		} else {
			console.error(`SVELTHREE > ${c_name} > remove_instance_from_parent : invalid 'camera' instance value!`, {
				camera
			})
			return false
		}
	}
	/**
	 * Same as `remove_instance_from_parent()` just shorter syntax.
	 * Removes the (three) instance of the object created by the component from it's parent.
	 */
	export const remove = remove_instance_from_parent

	/** Returns the (three) instance of the object created by the component. */
	export const get_instance = (): THREE_PerspectiveCamera | undefined | null => camera

	/** Returns the `animation` object. */
	export const get_animation = (): SvelthreeAnimation | undefined => ani.getAnimation()
	/** Same as `get_animation()` just shorter syntax. Returns the `animation` object. */
	export const get_ani = get_animation

	/** Starts the `animation` object. */
	export const start_animation = (): void => ani.startAnimation()
	/** Same as `start_animation()` just shorter syntax. Starts the `animation` object. */
	export const start_ani = start_animation

	/** Sets `focus()` on the component / it's shadow dom element. */
	export const focused = (): void => {
		if (shadow_dom_el) {
			shadow_dom_el.focus()
		} else {
			console.error(
				`SVELTHREE > ${c_name} > Cannot set 'focus' because component's ShadowDOM-Element is not available!`,
				{ shadow_dom_el }
			)
		}
	}

	/**
	 * Primarily for internal usage. Clears all references to the currently managed three.js instance.
	 * Called by `remove_instance(...)` / `clear_old_component()` if the instance has been
	 * assigned to some other component (_before_).
	 */
	export const clear = () => {
		//console.warn(`CLEAR! -> ${name}`)

		camera = null

		// IMPORTANT //
		// has to be set to `null`, `undefined` would set `camera_uuid` if a cleared component recevies a camera
		// we don't want that, beacuse then the `handle_instance_change` wouldn't be triggered!
		camera_uuid = null
	}

	import type { SvelthreeComponentShadowDOMChild } from "../types/types-extra.js"
	const generated_children: SvelthreeComponentShadowDOMChild[] = []
	const user_created_children: SvelthreeComponentShadowDOMChild[] = []

	/**
	 * Pushes a user-created (_e.g. via `new Mesh({...})`_) or an internally generated / created (e.g. via `SvelthreeGLTF.apply(...)`) `svelthree`-component
	 * to a corresponding Array containing all user-created / internally generated (_registered_) child components, in order for them to be destroyed at the same time
	 * the parent component gets destroyed (_`onDestroy`_). See also `comp_ref.get_user_created_children()` and `comp_ref.get_generated_children()`.
	 */
	export const register_child_component = (
		component: SvelthreeComponentShadowDOMChild,
		generated?: boolean
	): SvelthreeComponentShadowDOMChild[] => {
		if (generated) {
			if (!generated_children.includes(component)) {
				generated_children.push(component)
			}

			return generated_children
		} else {
			if (!user_created_children.includes(component)) {
				user_created_children.push(component)
			}

			return user_created_children
		}
	}

	function destroy_registered_child_components(arr: (SvelthreeComponentShadowDOMChild | null)[]) {
		if (arr.length) {
			for (let i = 0; i < arr.length; i++) {
				const child_comp: SvelthreeComponentShadowDOMChild | null = arr[i]
				if (child_comp) child_comp.$destroy()
				arr[i] = null
			}

			arr.length = 0
		}
	}

	export const get_user_created_children = (): SvelthreeComponentShadowDOMChild[] => user_created_children
	export const get_generated_children = (): SvelthreeComponentShadowDOMChild[] => generated_children

	/** **Completely replace** `svelthree`-component's default `onMount`-callback logic, any `onMountStart` & `onMountEnd` logic will be ignored (_default verbosity will be gone_).
	 *
	 * **Accepts** a `SvelthreeLifecycleCallback<T>`-type function as a **value**, which can also be explicitly typed as a **synchronous** (_type `SvelthreeLifecycleCallbackSync<T>`_) or an **asynchronous** (_type `SvelthreeLifecycleCallbackAsync<T>`_) callback:
	 * ```ts
	 * (comp: T) => unknown | Promise<unknown>
	 * ```
	 * ☝️ _the **callback's argument** (`comp`) will be the actual **`svelthree`-component's instance reference**_. */
	export let onMountReplace: SvelthreeLifecycleCallback<CurrentComponentType> | undefined = undefined

	onMount(
		onMountReplace
			? () => (onMountReplace as SvelthreeLifecycleCallback<CurrentComponentType>)(self)
			: async () => {
					if (verbose && log_lc && (log_lc.all || log_lc.om)) {
						console.info(...c_lc(c_name, "onMount"))
					}

					if (camera) {
						if (verbose && log_mau) {
							console.debug(
								...c_mau(c_name, "onMount : camera.", {
									matrixAutoUpdate: camera.matrixAutoUpdate,
									matrixWorldNeedsUpdate: camera.matrixWorldNeedsUpdate
								})
							)
						}

						//no special `svelthree`-logic here
					}
			  }
	)

	/** **Inject** functionality at the **start** of `svelthree`-component's default `onDestroy`-callback logic (`asynchronous`).
	 * Only asynchronous functions will be `await`ed. (_default verbosity will not be affected_)
	 *
	 * **Accepts** a `SvelthreeLifecycleCallback<T>`-type function as a **value**, which can also be explicitly typed as a **synchronous** (_type `SvelthreeLifecycleCallbackSync<T>`_) or an **asynchronous** (_type `SvelthreeLifecycleCallbackAsync<T>`_) callback:
	 * ```ts
	 * (comp: T) => unknown | Promise<unknown>
	 * ```
	 * ☝️ _the **callback's argument** (`comp`) will be the actual **`svelthree`-component's instance reference**_. */
	export let onDestroyStart: SvelthreeLifecycleCallback<CurrentComponentType> | undefined = undefined

	/** **Inject** functionality at the **end** of `svelthree`-component's default `onDestroy`-callback logic (`asynchronous`).
	 * Only asynchronous functions will be `await`ed. (_default verbosity will not be affected_)
	 *
	 * **Accepts** a `SvelthreeLifecycleCallback<T>`-type function as a **value**, which can also be explicitly typed as a **synchronous** (_type `SvelthreeLifecycleCallbackSync<T>`_) or an **asynchronous** (_type `SvelthreeLifecycleCallbackAsync<T>`_) callback:
	 * ```ts
	 * (comp: T) => unknown | Promise<unknown>
	 * ```
	 * ☝️ _the **callback's argument** (`comp`) will be the actual **`svelthree`-component's instance reference**_. */
	export let onDestroyEnd: SvelthreeLifecycleCallback<CurrentComponentType> | undefined = undefined

	/** **Completely replace** `svelthree`-component's default `onDestroy`-callback logic, any `onDestroyStart` & `onDestroyEnd` logic will be ignored (_default verbosity will be gone_).
	 *
	 * **Accepts** a `SvelthreeLifecycleCallback<T>`-type function as a **value**, which can also be explicitly typed as a **synchronous** (_type `SvelthreeLifecycleCallbackSync<T>`_) or an **asynchronous** (_type `SvelthreeLifecycleCallbackAsync<T>`_) callback:
	 * ```ts
	 * (comp: T) => unknown | Promise<unknown>
	 * ```
	 * ☝️ _the **callback's argument** (`comp`) will be the actual **`svelthree`-component's instance reference**_. */
	export let onDestroyReplace: SvelthreeLifecycleCallback<CurrentComponentType> | undefined = undefined

	onDestroy(
		onDestroyReplace
			? () => (onDestroyReplace as SvelthreeLifecycleCallback<CurrentComponentType>)(self)
			: async () => {
					if (verbose && log_lc && (log_lc.all || log_lc.od)) {
						console.info(...c_lc(c_name, "onDestroy"))
					}

					if (camera) {
						if (verbose && log_mau) {
							console.debug(
								...c_mau(c_name, "onDestroy : camera.", {
									matrixAutoUpdate: camera.matrixAutoUpdate,
									matrixWorldNeedsUpdate: camera.matrixWorldNeedsUpdate
								})
							)
						}

						if (onDestroyStart) {
							if (onDestroyStart.constructor.name === "AsyncFunction") {
								await onDestroyStart(self)
							} else {
								onDestroyStart(self)
							}
						}

						remove_helper()
						if (ani) ani.destroyAnimation()

						destroy_registered_child_components(generated_children)
						destroy_registered_child_components(user_created_children)

						remove_instance_from_parent()

						if (onDestroyEnd) {
							if (onDestroyEnd.constructor.name === "AsyncFunction") {
								await onDestroyEnd(self)
							} else {
								onDestroyEnd(self)
							}
						}
					}
			  }
	)

	/** **Completely replace** `svelthree`-component's default `beforeUpdate`-callback logic, any `beforeUpdateStart` & `beforeUpdateEnd` logic will be ignored (_default verbosity will be gone_).
	 *
	 * **Accepts** a `SvelthreeLifecycleCallback<T>`-type function as a **value**, which can also be explicitly typed as a **synchronous** (_type `SvelthreeLifecycleCallbackSync<T>`_) or an **asynchronous** (_type `SvelthreeLifecycleCallbackAsync<T>`_) callback:
	 * ```ts
	 * (comp: T) => unknown | Promise<unknown>
	 * ```
	 * ☝️ _the **callback's argument** (`comp`) will be the actual **`svelthree`-component's instance reference**_. */
	export let beforeUpdateReplace: SvelthreeLifecycleCallback<CurrentComponentType> | undefined = undefined

	beforeUpdate(
		beforeUpdateReplace
			? () => (beforeUpdateReplace as SvelthreeLifecycleCallback<CurrentComponentType>)(self)
			: async () => {
					if (verbose && log_lc && (log_lc.all || log_lc.bu)) {
						console.info(...c_lc(c_name, "beforeUpdate"))
					}

					if (camera) {
						if (verbose && log_mau) {
							console.debug(
								...c_mau(c_name, "beforeUpdate : camera.", {
									matrixAutoUpdate: camera.matrixAutoUpdate,
									matrixWorldNeedsUpdate: camera.matrixWorldNeedsUpdate
								})
							)
						}

						//no special `svelthree`-logic here
					}
			  }
	)

	/** **Inject** functionality at the **start** of `svelthree`-component's default `afterUpdate`-callback logic (`asynchronous`).
	 * Only asynchronous functions will be `await`ed. (_default verbosity will not be affected_)
	 *
	 * **Accepts** a `SvelthreeLifecycleCallback<T>`-type function as a **value**, which can also be explicitly typed as a **synchronous** (_type `SvelthreeLifecycleCallbackSync<T>`_) or an **asynchronous** (_type `SvelthreeLifecycleCallbackAsync<T>`_) callback:
	 * ```ts
	 * (comp: T) => unknown | Promise<unknown>
	 * ```
	 * ☝️ _the **callback's argument** (`comp`) will be the actual **`svelthree`-component's instance reference**_. */
	export let afterUpdateStart: SvelthreeLifecycleCallback<CurrentComponentType> | undefined = undefined

	/** **Inject** functionality at the **end** of `svelthree`-component's default `afterUpdate`-callback logic (`asynchronous`).
	 * Only asynchronous functions will be `await`ed. (_default verbosity will not be affected_)
	 *
	 * **Accepts** a `SvelthreeLifecycleCallback<T>`-type function as a **value**, which can also be explicitly typed as a **synchronous** (_type `SvelthreeLifecycleCallbackSync<T>`_) or an **asynchronous** (_type `SvelthreeLifecycleCallbackAsync<T>`_) callback:
	 * ```ts
	 * (comp: T) => unknown | Promise<unknown>
	 * ```
	 * ☝️ _the **callback's argument** (`comp`) will be the actual **`svelthree`-component's instance reference**_. */
	export let afterUpdateEnd: SvelthreeLifecycleCallback<CurrentComponentType> | undefined = undefined

	/** **Completely replace** `svelthree`-component's default `afterUpdate`-callback logic, any `afterUpdateStart` & `afterUpdateEnd` logic will be ignored (_default verbosity will be gone_).
	 *
	 * **Accepts** a `SvelthreeLifecycleCallback<T>`-type function as a **value**, which can also be explicitly typed as a **synchronous** (_type `SvelthreeLifecycleCallbackSync<T>`_) or an **asynchronous** (_type `SvelthreeLifecycleCallbackAsync<T>`_) callback:
	 * ```ts
	 * (comp: T) => unknown | Promise<unknown>
	 * ```
	 * ☝️ _the **callback's argument** (`comp`) will be the actual **`svelthree`-component's instance reference**_. */
	export let afterUpdateReplace: SvelthreeLifecycleCallback<CurrentComponentType> | undefined = undefined

	afterUpdate(
		afterUpdateReplace
			? () => (afterUpdateReplace as SvelthreeLifecycleCallback<CurrentComponentType>)(self)
			: async () => {
					if (verbose && log_lc && (log_lc.all || log_lc.au)) {
						console.info(...c_lc(c_name, "afterUpdate"))
					}

					if (camera) {
						if (verbose && log_mau) {
							console.debug(
								...c_mau(c_name, "afterUpdate : camera.", {
									matrixAutoUpdate: camera.matrixAutoUpdate,
									matrixWorldNeedsUpdate: camera.matrixWorldNeedsUpdate
								})
							)
						}

						if (afterUpdateStart) {
							if (afterUpdateStart.constructor.name === "AsyncFunction") {
								await afterUpdateStart(self)
							} else {
								afterUpdateStart(self)
							}
						}

						// Update local matrix after all (props) changes (async microtasks) have been applied.
						if (camera && !camera.matrixAutoUpdate) camera.updateMatrix()

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

						if (store) {
							if (!store.rendererComponent) {
								await tick()
							}
							if (!store.rendererComponent) {
								console.error(
									`SVELTHREE > ${c_name} > afterUpdate : Cannot schedule auto-render, 'store.rendererComponent' not available!`,
									{ rendererComponent: store.rendererComponent }
								)
							} else {
								schedule_render_auto()
							}
						} else {
							console.error(`SVELTHREE > ${c_name} > afterUpdate : invalid 'store' instance value!`, {
								store
							})
						}

						if (afterUpdateEnd) {
							if (afterUpdateEnd.constructor.name === "AsyncFunction") {
								await afterUpdateEnd(self)
							} else {
								afterUpdateEnd(self)
							}
						}
					}
			  }
	)

	const schedule_render_auto = (): void => {
		if (store?.rendererComponent?.get_mode() === "auto") {
			// prevent an additional component update by not accessing the `root_scene` prop directly.
			if (root_scene_obj.value) {
				root_scene_obj.value.userData.dirty = true
			} else {
				console.error(
					`SVELTHREE > ${c_name} > schedule_render_auto : Cannot mark 'root_scene' as 'dirty', 'root_scene_obj.value' not available!`,
					{ root_scene_obj, root_scene }
				)
			}
			store.rendererComponent.schedule_render_auto(root_scene)
		}
	}

	export const state = (): Partial<IStatePerspectiveCamera> => {
		return {}
	}

	if (!Object.hasOwn(self, "state")) {
		Object.defineProperty(self, "state", {
			value: () => {
				return {
					log_all,
					log_dev,
					log_rs,
					log_lc,
					log_mau,
					id,
					camera,
					name,
					params,
					tabindex,
					aria,
					mau,
					matrix,
					props,
					pos,
					rot,
					quat,
					scale,
					lookAt,
					aspect,
					far,
					filmGauge,
					filmOffset,
					focus,
					fov,
					near,
					view,
					zoom,
					helper,
					animation,
					aniauto,
					onMountReplace,
					onDestroyStart,
					onDestroyEnd,
					onDestroyReplace,
					beforeUpdateReplace,
					afterUpdateStart,
					afterUpdateEnd,
					afterUpdateReplace
				}
			},
			writable: false
		})
	}
</script>

<slot />
