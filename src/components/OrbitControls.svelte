<!--
`accessors:true` hast to be set per component because of the svelte-language-server bug, otherwise accessors would be falsely detected as missing and highlighted as errors.
svelthree uses svelte-accmod, where accessors are always `true`, regardless of `svelte:options`.  
-->
<svelte:options accessors />

<!--
@component
**svelthree** _OrbitControls_ Component.
[ tbd ]  Link to Docs.
-->
<script context="module" lang="ts">
	export type OrbitControlsProps = OnlyWritableNonFunctionProps<Omit<OrbitControls, PropBlackList>>
</script>

<script lang="ts">
	import type { Scene } from "three"

	import { beforeUpdate, onMount, afterUpdate, onDestroy, getContext, setContext } from "svelte"
	import { get_current_component } from "svelte/internal"
	import { self as _self } from "svelte/internal"
	import { c_rs, c_lc, c_mau, c_dev, verbose_mode, get_comp_name } from "../utils/SvelthreeLogger"
	import type { LogLC, LogDEV } from "../utils/SvelthreeLogger"

	import { svelthreeStores } from "../stores"
	import { PropUtils, SvelthreeProps } from "../utils"
	import type { Writable } from "svelte/store"

	import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
	import { CameraHelper } from "three"
	import type { Vector3, PerspectiveCamera, OrthographicCamera } from "three"
	import type { default as PerspCamSvelthreeComponent } from "./PerspectiveCamera.svelte"
	import type { default as OrthoCamSvelthreeComponent } from "./OrthographicCamera.svelte"
	import type { default as CanvasSvelthreeComponent } from "../components/Canvas.svelte"
	import type { OnlyWritableNonFunctionProps, PropBlackList } from "../types-extra"

	const self = get_current_component()
	const c_name = get_comp_name(self)

	const verbose: boolean = verbose_mode()

	export let log_all: boolean = false
	export let log_dev: { [P in keyof LogDEV]: LogDEV[P] } = log_all ? { all: true } : undefined
	export let log_rs: boolean = log_all
	export let log_lc: { [P in keyof LogLC]: LogLC[P] } = log_all ? { all: true } : undefined
	export let log_mau: boolean = log_all

	let scene: Scene = getContext("scene")
	const sti: number = getContext("store_index")
	const canvas_dom: Writable<{ element: HTMLCanvasElement }> = getContext("canvas_dom")
	/** Returns the `orbitcontrols` instance created by the component & allows providing (_injection_) of (_already created / premade_) `THREE.OrbitControls` instances. */
	export let orbitcontrols: OrbitControls = undefined

	export const is_svelthree_component: boolean = true
	export const is_svelthree_orbitcontrols: boolean = true

	/** Display a console warning if the `OrbitControls` component's `cam` attribute was assigned a currently _inactive_ camera (also adss a `CameraHelper` to the assigned Camera). Default is `true`. Set  `warn={false}` to hide the warning (_also: no `CameraHelper` be added_). */
	export let warn: boolean = true

	let index_in_orbitcontrols: number = undefined

	export let cam: PerspCamSvelthreeComponent | OrthoCamSvelthreeComponent | PerspectiveCamera | OrthographicCamera =
		undefined
	export let dom_el: HTMLElement | CanvasSvelthreeComponent = undefined

	// renderer (needed) updates orbitcontrols in case of damping and autorotate,
	// canvas_dom.element and activeCamera are needed for default values if no 'cam' or 'dom_el' were provided.
	$: if (!orbitcontrols && $canvas_dom?.element && $svelthreeStores[sti].activeCamera) create_orbitcontrols()

	/** `OrbitControls` are bound to a `Camera` and a `<canvas>` DOM Element,
	 * so the `OrbitControls` component can be placed anywhere in the components scene graph. */
	function create_orbitcontrols(): void {
		console.log("create_orbitcontrols!")
		const oc_cam: PerspectiveCamera | OrthographicCamera = get_oc_cam()
		const oc_dom: HTMLElement = get_oc_dom()

		try {
			orbitcontrols = new OrbitControls(oc_cam, oc_dom)
			if (!orbitcontrols["userData"]) orbitcontrols["userData"] = {}
			$svelthreeStores[sti].orbitcontrols.push(orbitcontrols)
			index_in_orbitcontrols = orbitcontrols["userData"].index_in_orbitcontrols
			orbitcontrols["userData"].svelthreeComponent = self

			if (oc_cam !== $svelthreeStores[sti].activeCamera && warn) {
				let camhelper = new CameraHelper(oc_cam)
				oc_cam.parent.add(camhelper)
				console.warn(
					`SVELTHREE > ${c_name} > OrbitControls 'cam' is not the currently active camera, is this intended? Set 'warn={false}' to hide this warning (CameraHelper will also not be added anymore).`,
					{ orbitcontrols }
				)
			}
		} catch (error) {
			console.error(
				`SVELTHREE > ${c_name} > Oops, something went wrong while trying to create and add OrbitControls!`,
				error,
				$svelthreeStores[sti],
				{ scene, sti }
			)
		}
	}

	function get_oc_cam(): PerspectiveCamera | OrthographicCamera {
		if (cam !== undefined && cam["is_svelthree_camera"]) {
			return (cam as PerspCamSvelthreeComponent | OrthoCamSvelthreeComponent).get_instance()
		}
		if (cam !== undefined && cam["isPerspectiveCamera"]) {
			return cam as PerspectiveCamera
		}
		if (cam !== undefined && cam["isOrthographicCamera"]) {
			return cam as OrthographicCamera
		}
		if (cam === undefined) {
			return $svelthreeStores[sti].activeCamera
		}
	}

	function get_oc_dom(): HTMLElement {
		if (dom_el !== undefined && dom_el["is_svelthree_canvas"]) {
			return (dom_el as CanvasSvelthreeComponent).getDomElement()
		}
		if (dom_el !== undefined) {
			return dom_el as HTMLElement
		}
		if (dom_el === undefined) {
			return $canvas_dom.element
		}
	}

	let sProps: SvelthreeProps

	// IMPORTANT  `props` will be overridden by 'shorthand' attributes!
	/** **shorthand** attribute for setting properties using key-value pairs in an `Object`. */
	export let props: { [P in keyof OrbitControlsProps]: OrbitControlsProps[P] } = undefined

	$: if (!sProps && orbitcontrols && props) sProps = new SvelthreeProps(orbitcontrols)
	$: if (props && sProps) update_props()
	function update_props() {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "props", props))
		sProps.update(props)
	}

	/** When set to false, the controls will not respond to user input. Default is `true`.
	 * [See threejs-docs.](https://threejs.org/docs/#examples/en/controls/OrbitControls.enabled) */
	export let enabled: boolean = true
	$: if (orbitcontrols && (enabled === true || !enabled)) set_enabled()

	function set_enabled(): void {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "enabled", enabled))
		orbitcontrols.enabled = !!enabled
	}

	/** The focus point of the controls, the `.object` orbits around this. It can be updated manually at any point to change the focus of the controls.
	 * [See threejs-docs.](https://threejs.org/docs/#examples/en/controls/OrbitControls.target) */
	export let target: Vector3 = undefined
	$: if (orbitcontrols && target !== undefined) set_target()

	function set_target(): void {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "target", target))
		orbitcontrols.target = target
	}

	/** Enable or disable horizontal and vertical rotation of the camera. Default `true`.
	 * [See threejs-docs.](https://threejs.org/docs/#examples/en/controls/OrbitControls.enableRotate) */
	export let rotate: boolean = true
	$: if (orbitcontrols && (rotate === true || !rotate)) set_rotate()

	function set_rotate(): void {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "rotate", rotate))
		orbitcontrols.enableRotate = !!rotate
	}

	/** Set to `true` to automatically rotate around the target.
	 * [See threejs-docs.](https://threejs.org/docs/#examples/en/controls/OrbitControls.autoRotate) */
	export let auto: boolean = false
	$: if (orbitcontrols && (auto === true || !auto)) set_auto()

	function set_auto(): void {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "auto", auto))
		orbitcontrols.autoRotate = !!auto
	}

	/** How fast to rotate around the target if `autorot` is `true`. Default is `2.0`, which equates to 30 seconds per orbit at 60fps.
	 * [See threejs-docs.](https://threejs.org/docs/#examples/en/controls/OrbitControls.autoRotateSpeed) */
	export let auto_speed: number = undefined
	$: if (orbitcontrols && auto_speed !== undefined) set_auto_speed()

	function set_auto_speed(): void {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "auto_speed", auto_speed))
		orbitcontrols.autoRotateSpeed = auto_speed
	}

	/** Set to true to enable damping (inertia), which can be used to give a sense of weight to the controls. Default is `false`.
	 * [See threejs-docs.](https://threejs.org/docs/#examples/en/controls/OrbitControls.enableDamping) */
	export let damping: boolean = false
	$: if (orbitcontrols && (damping === true || !damping)) set_damping()

	function set_damping(): void {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "damping", damping))
		orbitcontrols.enableDamping = !!damping
	}

	/** Enable or disable camera panning. Default is `true`.
	 * [See threejs-docs.](https://threejs.org/docs/#examples/en/controls/OrbitControls.enablePan) */
	export let pan: boolean = true
	$: if (orbitcontrols && (pan === true || !pan)) set_pan()

	function set_pan(): void {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "pan", pan))
		orbitcontrols.enablePan = !!pan
	}

	/** Enable or disable zooming (dollying) of the camera. Default `false`.
	 * [See threejs-docs.](https://threejs.org/docs/#examples/en/controls/OrbitControls.enableZoom) */
	export let zoom: boolean = false
	$: if (orbitcontrols && (zoom === true || !zoom)) set_zoom()

	function set_zoom(): void {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "zoom", zoom))
		orbitcontrols.enableZoom = !!zoom
	}

	/** Returns the (three) instance of the object created by the component. */
	export const get_instance = (): OrbitControls => orbitcontrols

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

					if (onDestroy_inject_before) onDestroy_inject_before()

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
			  }
	)

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
			  }
	)
</script>
