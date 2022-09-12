<!--
`accessors:true` hast to be set per component because of the svelte-language-server bug, otherwise accessors would be falsely detected as missing and highlighted as errors.
svelthree uses svelte-accmod, where accessors are always `true`, regardless of `svelte:options`.  
-->
<svelte:options accessors />

<!--
@component
**svelthree** _CubeCamera_ Component.
Renders a `CubeMap` which can be used with **non-PBR** materials having an `.envMap` property. `CubeCamera` is currently not working with PBR materials like `MeshStandardMaterial` (see [22236](https://github.com/mrdoob/three.js/issues/22236)).     
[ tbd ]  Link to Docs. -->
<script lang="ts">
	import type { Scene as THREE_Scene } from "three"

	import { beforeUpdate, onMount, afterUpdate, onDestroy, getContext, setContext } from "svelte"
	import { get_current_component } from "svelte/internal"
	import { self as _self } from "svelte/internal"
	import { c_rs, c_lc, c_mau, c_dev, verbose_mode, get_comp_name } from "../utils/SvelthreeLogger"
	import type { LogLC, LogDEV } from "../utils/SvelthreeLogger"
	import type { SvelthreeShadowDOMElement } from "../types/types-extra"
	import { if$_instance_change } from "../logic/if$"
	import { remove_instance, recreate_shadow_dom_el, set_initial_userdata, find_in_canvas } from "../logic/shared"

	import type { Euler, Matrix4, Quaternion } from "three"
	import type { Object3D as THREE_Object3D } from "three"

	import { svelthreeStores } from "svelthree/stores"
	import { PropUtils, SvelthreeProps } from "../utils"

	import { SvelthreeAnimation } from "../ani"
	import type { SvelthreeAnimationFunction } from "../types/types-extra"

	import { CubeCamera as THREE_CubeCamera } from "three"
	import { WebGLCubeRenderTarget } from "three"
	import type { CubeCameraProperties, WebGLCubeRenderTargetProperties } from "../types/types-comp-props"
	// custom CubeCameraHelper
	import { CubeCameraHelper } from "../utils"
	import { get_root_scene } from "../utils/SceneUtils"
	import { Vector3 } from "three"
	import type { CubeTexture, WebGLRenderer, WebGLRenderTargetOptions, Camera, Mesh } from "three"
	import type {
		Material,
		MeshBasicMaterialParameters,
		MeshPhongMaterial,
		MeshBasicMaterial,
		MeshLambertMaterial
	} from "three"
	import type { RemoveLast } from "../types/types-extra"
	import type { default as MeshSvelthreeComponent } from "./Mesh.svelte"
	import type { default as Object3DSvelthreeComponent } from "./Object3D.svelte"

	/**
	 *  SVELTEKIT  SSR /
	 * `browser` is needed for the SvelteKit setup (SSR / CSR / SPA).
	 * For non-SSR output in RollUp only and Vite only setups (CSR / SPA) we're just mimicing `$app/env` where `browser = true`,
	 * -> TS fix: `$app/env` mapped to `src/$app/env` via svelthree's `tsconfig.json`'s `path` property.
	 * -> RollUp only setup: replace `$app/env` with `../$app/env`
	 * The import below will work out-of-the-box in a SvelteKit setup.
	 */
	import { browser } from "$app/env"

	const self = get_current_component()
	const c_name = get_comp_name(self)
	/** svelthree component's type (e.g. component `Foo` is of type 'Foo' etc.) */
	export const type: string = c_name

	const verbose: boolean = verbose_mode()

	export let log_all = false
	export let log_dev: { [P in keyof LogDEV]: LogDEV[P] } = log_all ? { all: true } : undefined
	export let log_rs: boolean = log_all
	export let log_lc: { [P in keyof LogLC]: LogLC[P] } = log_all ? { all: true } : undefined
	export let log_mau: boolean = log_all

	/**
	 * - `false` (default) -> `update_cubecam()` will be called **once on initialization**, further updates have to be done **manually** by calling `[CubeCamera component reference].update_cubecam()`.
	 * - `true` -> WebGLRenderer component will update the CubeCamera (_renderTarget.texture_) on **every frame**.
	 */
	export let dynamic = false

	let camera_updated = false

	/** `CubeCamera` instances are always added to the `root_scene`
	 * no matter which component the `CubeCamera` component was added to. */
	let root_scene: THREE_Scene | null = undefined
	let root_scene_obj = { value: undefined }

	$: if (root_scene === undefined) {
		root_scene = get_root_scene(getContext("scene"))
		root_scene_obj.value = root_scene
	}

	/** Bind `CubeCamera`'s position to the specified component / object (three) instance
	 * ☝️ The `pos` shorthand attribute will override `bind_pos`! _Alternatively (standard)_:
	 * add the `CubeCamera` component as a child to either a `Mesh` or an `Object3D`/`Group` component,
	 * in this case `CubeCamera`'s position will be bound to it's parent / object (three) instance. */
	export let bind_pos: MeshSvelthreeComponent<any> | Object3DSvelthreeComponent | THREE_Object3D = undefined
	$: if (camera && $svelthreeStores[sti].renderer && bind_pos && !bind_pos_offset && !dynamic) update_cubecam()

	/** Adjust `CubeCamera`'s position by setting an offset relative to the pivot of the object specified by `bind_pos`. */
	export let bind_pos_offset: Vector3 = undefined
	$: if (camera && $svelthreeStores[sti].renderer && bind_pos && bind_pos_offset && !dynamic) update_cubecam()

	/** Specify which objects / components should be hidden on `CubeCamera` update.
	 * Default: `CubeCamera`'s parent component's object (three) instance will be hidden.
	 * -> ☝️ If you add `CubeCamera` as a direct child of a `Scene` component without specifying some other object / objects to be hidden,
	 * the **root scene** will be hidden during the 'envMap'-texture rendering and your 'envMap' texture will be blank! */
	export let hide: (MeshSvelthreeComponent<any> | Object3DSvelthreeComponent | THREE_Object3D)[] = undefined

	/** Binds the texture generated by the `CubeCamera` to some `Mesh`-component's `.material`(_currently non PBR + has `.envMap`_).
	 * This is the opposite of / alternative to binding the material's `.envMap` property to `[CubeCamera component reference].texture` */
	export let bind_tex: MeshPhongMaterial | MeshBasicMaterial | MeshLambertMaterial = undefined
	// SVELTEKIT  SSR
	$: if (browser && bind_tex) bind_tex.envMap = texture

	/** Reference to the `CubeTexture` instance generated by the `CubeCamera` (_full path: `camera.renderTarget.texture`_). */
	export let texture: CubeTexture = undefined
	// SVELTEKIT  SSR
	$: texture = browser ? camera.renderTarget.texture : undefined

	/** Set to `true` for correct **floor reflections** (_default: `false`_). */
	export let is_floor = false

	let scene: THREE_Scene = getContext("scene")
	const sti: number = getContext("store_index")

	/** [ **feature**: allow providing (_injection_) of (_already created_) threejs object instances ].
	 * `create` is an internal indicator for how the component's corresponding threejs object instance has to be / has been created.
	 * It's being set to `false` on initialization if an (_already created_) threejs object instance was provided,
	 * otherwise it's set to `true`, means a new threejs object instance will be created. */
	let create = false

	/** The (three) instance that was shared to this component as it's 'parent' which can be either another instance / object or a scene / root scene. */
	let our_parent: THREE_Object3D = undefined

	/** Shadow DOM element generated by our parent scene / root scene. Used as fallback if this component has no non-`Scene` component as parent. */
	let scene_shadow_dom_el: SvelthreeShadowDOMElement = getContext("scene_shadow_dom_el")

	/** Shadow DOM element generated by our parent component (_not `Canvas`_) shared with this component (child) via context.
	Fallback is `scene_shadow_dom_el` or `shadow_root_el` in case of the `Scene` component. */
	let our_parent_shadow_dom_el: SvelthreeShadowDOMElement = undefined

	/** Shadow DOM element generated by this component. Shared by this component (as parent) to it's children via context as "parent_shadow_dom_el". */
	let shadow_dom_el: SvelthreeShadowDOMElement = undefined
	export const get_shadow_dom_el = (): SvelthreeShadowDOMElement => shadow_dom_el

	/** Returns the `camera` instance created by the component & allows providing (_injection_) of (_already created / premade_) `THREE.CubeCamera` instances. */
	export let camera: THREE_CubeCamera = undefined

	/** Returns the `renderTarget` instance created by the component & allows providing (_injection_) of (_already created / premade_) `THREE.WebGLCubeRenderTarget` instances. */
	export let renderTarget: WebGLCubeRenderTarget = undefined

	let camera_uuid: string = undefined

	/** Sets the `name` property of the created / injected three.js instance. */
	export let name: string = undefined
	let index_in_cubecameras: number = undefined

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
		if (camera.type === "CubeCamera") {
			// with `CubeCameras` we push the component reference to svelthreeStores,
			// beacuse we need to access it's `update()` function from the `WebGLRenderer` component.

			$svelthreeStores[sti].cubeCameras.push(self)

			index_in_cubecameras = camera.userData.index_in_cubecameras
		} else {
			throw new Error(
				`SVELTHREE > ${c_name} provided 'camera' instance has wrong type '${camera.type}', should be '${c_name}'!`
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

		// SVELTEKIT  SSR /
		if (browser) create_shadow_dom()
	}

	/** Initializes `renderTarget` with provided constructor parameters.*/
	export let renderTargetParams: ConstructorParameters<typeof WebGLCubeRenderTarget> = undefined

	/** Initializes `camera` with provided constructor parameters -> `renderTarget` is not needed (assigned internally). */
	export let params: RemoveLast<ConstructorParameters<typeof THREE_CubeCamera>> = undefined

	// create 'renderTarget' first
	// SVELTEKIT  SSR
	$: if (browser && !renderTarget && create) {
		// leave any parameter errors handling to threejs
		if (renderTargetParams) {
			renderTarget = new WebGLCubeRenderTarget(...renderTargetParams)
		} else {
			throw new Error(
				`SVELTHREE > ${c_name} : You need to specify 'renderTargetParams' attribute in order to create 'renderTarget' `
			)
		}

		if (verbose && log_dev) console.debug(...c_dev(c_name, `'renderTarget' created!`, { renderTarget }))
	}

	// create 'camera'
	$: if (!camera && renderTarget && create) {
		// leave any parameter errors handling to threejs
		if (params) {
			camera = new THREE_CubeCamera(...params, renderTarget)
		} else {
			throw new Error(
				`SVELTHREE > ${c_name} : You need to specify 'params' attribute in order to create 'camera' `
			)
		}

		set_initial_userdata(camera, self)

		// with `CubeCameras` we push the component reference to svelthreeStores,
		// beacuse we need to access it's `update()` function from the `WebGLRenderer` component.

		$svelthreeStores[sti].cubeCameras.push(self)

		index_in_cubecameras = camera.userData.index_in_cubecameras

		if (verbose && log_dev) console.debug(...c_dev(c_name, `${camera.type} created!`, { camera }))
	}

	// ---  AFTER  INITIALIZATION  --- //

	// set camera_uuid the first time
	$: if (camera && camera_uuid === undefined) set_uuid()

	function set_uuid(): void {
		camera_uuid = camera.uuid
	}

	// GENERATOR REMARK: 'reactive_re_creation_logic' not implemented for 'CubeCamera'!

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
		// SVELTEKIT  SSR /
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
	export let tabindex: number = undefined

	$: if (shadow_dom_el && tabindex !== undefined) {
		shadow_dom_el.tabIndex = tabindex
	}

	// accessability -> shadow dom wai-aria
	// eslint-disable-next-line no-undef
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

	// this reactive statement willl be triggered on any 'camera' instance change (also e.g. `camera.foo = value`)
	$: if (camera) if$_instance_change(camera, root_scene, camera_uuid, create, "camera", name, handle_instance_change)

	/** Called from by the `if$_instance_change` logic if needed. */
	function handle_instance_change(): void {
		if ((camera_uuid && camera.uuid !== camera_uuid) || !camera_uuid) {
			const uuid_to_remove: string = camera_uuid || camera.uuid
			const old_instance: THREE_Object3D = find_in_canvas($svelthreeStores[sti].scenes, uuid_to_remove)

			// update 'index_in_x'
			index_in_cubecameras = old_instance.userData.index_in_cubecameras
			camera.userData.index_in_cubecameras = index_in_cubecameras

			remove_instance(old_instance, "camera", camera, self)

			if (props) sProps = new SvelthreeProps(camera)

			// update store
			$svelthreeStores[sti].cubeCameras[index_in_cubecameras] = self
		}

		set_initial_userdata(camera, self)

		// `CubeCamera`'s instance `camera` is always added to the `root_scene` no matter which component the `CubeCamera` component was added to.
		// the `our_parent` is needed for positioning only.
		root_scene.add(camera)
		camera_uuid = camera.uuid

		if (verbose && log_dev) {
			console.debug(
				...c_dev(c_name, `${camera.type} was added to ${root_scene.type}!`, {
					camera,
					root_scene,
					total: root_scene.children.length
				})
			)
		}
	}

	interface MaterialWithEnvMap extends Material {
		envMap?: MeshBasicMaterialParameters["envMap"]
	}

	/** Called internally from WebGLRenderer component if `dynamic` is `true` (default). Can also be called directly if `dynamic` is `false`. */
	export const update_cubecam = () => {
		// TODO  FEATURE: There could be some logic if camera.parent is scene (&& NOT the root scene) traversing all objects in a scene,
		// checking if their material has an '.envMap' property and is not a PBR material and then apply the the cubemap texture to those objects.
		// But for now, this is not possible.

		let bound_pos: typeof bind_pos = bind_pos || our_parent
		let to_hide: typeof hide | typeof bind_pos = hide || bound_pos
		let renderer: WebGLRenderer = $svelthreeStores[sti].renderer
		let active_scene: THREE_Scene = $svelthreeStores[sti].activeScene

		if (pos === undefined) {
			// the floor hack -> see https://jsfiddle.net/3mprbLc9/
			if (is_floor) {
				let active_cam: Camera = $svelthreeStores[sti].activeCamera
				let target_pos: Vector3 = get_cubecam_target_position(active_cam)
				camera.position.copy(target_pos)

				// IMPORTANT  GOOD  this does NOT triggers all 'camera' bound reactive statements as opposed to `camera.position.y *= -1`!
				camera.position.setY(camera.position.y * -1)
			} else {
				let target_pos: Vector3 = get_cubecam_target_position(bound_pos)
				if (bind_pos_offset) {
					let corrected_target_pos: Vector3 = target_pos.clone().add(bind_pos_offset)
					camera.position.copy(corrected_target_pos)
				} else {
					camera.position.copy(target_pos)
				}
			}
		}

		change_visibility(to_hide, false)
		camera.update(renderer, active_scene)
		change_visibility(to_hide, true)

		camera_updated = true

		if (!bind_tex) {
			let op: Mesh = bound_pos as Mesh
			let op_mat: MaterialWithEnvMap = op.material as MaterialWithEnvMap
			if (op_mat && Object.prototype.hasOwnProperty.call(op_mat, "envMap")) {
				op_mat.envMap = camera.renderTarget.texture
			}
		}
	}

	function change_visibility(to_change: typeof hide | typeof bind_pos, val: boolean) {
		let toc: typeof hide = to_change as typeof hide
		if (toc.length && toc.length > 0) {
			for (let i = 0; i < toc.length; i++) {
				set_visibility(toc[i], val)
			}
		} else {
			set_visibility(toc, val)
		}
	}

	function set_visibility(obj: typeof hide | typeof bind_pos, val: boolean) {
		if (obj["is_svelthree_component"]) {
			let o: MeshSvelthreeComponent<any> | Object3DSvelthreeComponent = obj as
				| MeshSvelthreeComponent<any>
				| Object3DSvelthreeComponent
			o.get_instance().visible = val
		} else {
			let o: THREE_Object3D = obj as THREE_Object3D
			o.visible = val
		}
	}

	function get_cubecam_target_position(obj: typeof bind_pos | Camera): Vector3 {
		let wp: Vector3 = new Vector3()

		if (typeof obj["getWorldPosition"] === "function") {
			let o: THREE_Object3D = obj as THREE_Object3D
			o.getWorldPosition(wp)
		} else {
			let o: MeshSvelthreeComponent<any> | Object3DSvelthreeComponent = obj as
				| MeshSvelthreeComponent<any>
				| Object3DSvelthreeComponent
			o.get_instance().getWorldPosition(wp)
		}

		return wp
	}

	/** Override object's `.matrixAutoUpdate` set (*on initialzation*) by scene's `.matrixAutoUpdate` (*default is `true`*). Also: `mau` can be changed on-the-fly.*/
	export let mau: boolean = undefined
	$: if (camera) camera.matrixAutoUpdate = scene.matrixAutoUpdate
	$: if (camera && mau !== undefined) camera.matrixAutoUpdate = mau

	$: if (camera && name) camera.name = name
	$: if (shadow_dom_el && name) shadow_dom_el.dataset.name = name

	/** ☝️ `matrix` **shorthand** attribute overrides ( *are ignored* ) `pos`, `rot`, `quat`, `scale` and `lookAt` 'shorthand' attributes! */
	export let matrix: Matrix4 | Parameters<Matrix4["set"]> = undefined

	const w_sh = PropUtils.getShortHandAttrWarnings(`SVELTHREE > ${c_name} >`)

	let sProps: SvelthreeProps

	let sPropsTarget: SvelthreeProps

	/** **shorthand** attribute for setting properties using key-value pairs in an `Object`. */
	export let renderTargetOptions: { [P in keyof WebGLRenderTargetOptions]: WebGLRenderTargetOptions[P] } = undefined
	$: if (renderTargetOptions && camera_updated) recreate_render_target()

	function recreate_render_target() {
		//console.log("recreate_render_target!")
		if (verbose && log_rs)
			console.debug(...c_rs(c_name, "renderTargetOptions (recreating 'renderTarget')", renderTargetOptions))
		// without camera recreation!
		// renderTarget has to be recreated, see https://github.com/mrdoob/three.js/blob/master/src/renderers/WebGLCubeRenderTarget.js
		// it creates a whole bunch of stuff based on provided options. The main goal was not to recreate the camera.
		renderTarget = new WebGLCubeRenderTarget(renderTargetParams[0], renderTargetOptions)
		camera.renderTarget = renderTarget

		update_cubecam()
		update_texture_bindings()
	}

	function update_texture_bindings() {
		if (bind_tex) {
			bind_tex.envMap = camera.renderTarget.texture
		} else {
			if (bind_pos) {
				if (bind_pos["mat"]) {
					bind_pos["mat"].envMap = camera.renderTarget.texture
				} else if (bind_pos["material"]) {
					bind_pos["material"].envMap = camera.renderTarget.texture
					bind_pos["material"].needsUpdate = true
				}
			} else if (our_parent) {
				if (our_parent["mat"]) {
					our_parent["mat"].envMap = camera.renderTarget.texture
				} else if (our_parent["material"]) {
					our_parent["material"].envMap = camera.renderTarget.texture
				}
			}
		}
	}

	/** **shorthand** attribute for setting properties using key-value pairs in an `Object`. */
	export let renderTargetProps: { [P in keyof WebGLCubeRenderTargetProperties]: WebGLCubeRenderTargetProperties[P] } =
		undefined

	$: if (!sPropsTarget && renderTargetProps && renderTargetProps) sPropsTarget = new SvelthreeProps(renderTargetProps)
	$: if (renderTargetProps && sPropsTarget) update_render_target_props()
	function update_render_target_props() {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "renderTargetProps", renderTargetProps))
		sPropsTarget.update(renderTargetProps)
	}

	// IMPORTANT  `props` will be overridden by 'shorthand' attributes!
	/** **shorthand** attribute for setting properties using key-value pairs in an `Object`. */
	export let props: { [P in keyof CubeCameraProperties]: CubeCameraProperties[P] } = undefined

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
	export let lookAt: Vector3 | Parameters<Vector3["set"]> | THREE_Object3D = undefined
	$: !matrix && camera && lookAt ? set_lookat() : lookAt && camera ? console.warn(w_sh.lookAt) : null
	function set_lookat() {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "lookAt", lookAt))
		PropUtils.setLookAtFromValue(camera, lookAt)
	}

	// IMPORTANT  `matrix` 'shorthand' attribute will override all other transforms ('shorthand' attributes)!
	$: if (matrix && camera) set_matrix()
	function set_matrix(): void {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "matrix", matrix))
		PropUtils.setMatrixFromValue(camera, matrix)
	}

	// no 'params' -> CameraHelper takes only a cam instance as a parameter.
	/** Creates and adds a `CubeCameraHelper` (_no `helperParams`_). */
	export let helper: boolean = undefined

	$: camera && !camera.userData.helper && helper === true ? add_helper() : null
	$: camera && camera.userData.helper && !helper ? remove_helper() : null

	function add_helper(): void {
		camera.userData.helper = new CubeCameraHelper(camera)
		camera.userData.helper.add(root_scene)
	}

	function remove_helper(): void {
		if (camera.userData.helper) {
			camera.userData.helper.remove()
			camera.userData.helper = null
		}
	}

	/** Animation logic to be performed with the (three) object instance created by the component. */
	export let animation: SvelthreeAnimationFunction = undefined

	let animationEnabled = false
	$: if (animation) animationEnabled = true

	/** Immediately start provided animation, default: `false`. Alternative: `<component_reference>.start_animation()` or shorter `.start_ani()`. */
	export let aniauto: boolean = undefined

	let ani: SvelthreeAnimation
	$: if (animation && animationEnabled) ani = new SvelthreeAnimation(scene, camera, animation, aniauto)

	let currentSceneActive = undefined
	$: currentSceneActive = $svelthreeStores[sti].scenes[scene.userData.index_in_scenes]?.isActive
	$: if (ani && currentSceneActive !== undefined) ani.onCurrentSceneActiveChange(currentSceneActive)

	/** Removes the (three) instance created by / provided to the component from it's parent. */
	export const remove_instance_from_parent = async (): Promise<boolean> => {
		// SVELTEKIT  SSR
		if (browser) {
			const removed: boolean = remove_instance(camera, "camera")
			return removed
		}
		return false
	}
	/**
	 * Same as `remove_instance_from_parent()` just shorter syntax.
	 * Removes the (three) instance of the object created by the component from it's parent.
	 */
	export const remove = remove_instance_from_parent

	/** Returns the (three) instance of the object created by the component. */
	export const get_instance = (): THREE_CubeCamera => camera

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

	import type { SvelthreeComponentShadowDOMChild } from "../types/types-extra"
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

	function destroy_registered_child_components(arr: SvelthreeComponentShadowDOMChild[]) {
		if (arr.length) {
			for (let i = 0; i < arr.length; i++) {
				const child_comp: SvelthreeComponentShadowDOMChild = arr[i]
				if (child_comp) child_comp.$destroy()
				arr[i] = null
			}

			arr.length = 0
		}
	}

	export const get_user_created_children = (): SvelthreeComponentShadowDOMChild[] => user_created_children
	export const get_generated_children = (): SvelthreeComponentShadowDOMChild[] => generated_children

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

					if (ani) ani.destroyAnimation()

					destroy_registered_child_components(generated_children)
					destroy_registered_child_components(user_created_children)

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
					if (camera && !camera.matrixAutoUpdate) camera.updateMatrix()

					if (verbose && !camera.matrixAutoUpdate && log_mau) {
						console.debug(
							...c_mau(c_name, "afterUpdate : camera.", {
								matrixAutoUpdate: camera.matrixAutoUpdate,
								matrixWorldNeedsUpdate: camera.matrixWorldNeedsUpdate
							})
						)
					}

					if ($svelthreeStores[sti].rendererComponent?.mode === "auto") {
						// prevent an additional component update by not accessing the `root_scene` prop directly.
						root_scene_obj.value.userData.dirty = true
						$svelthreeStores[sti].rendererComponent.schedule_render_auto(root_scene)
					}

					if (afterUpdate_inject_after) afterUpdate_inject_after()
			  }
	)
</script>

<slot />
