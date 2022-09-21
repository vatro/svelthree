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
<script lang="ts">
	import type { Scene as THREE_Scene } from "three"

	import { beforeUpdate, onMount, afterUpdate, onDestroy, getContext } from "svelte"
	import { get_current_component } from "svelte/internal"
	import { self as _self } from "svelte/internal"
	import { c_rs, c_lc, verbose_mode, get_comp_name } from "../utils/SvelthreeLogger"
	import type { LogLC } from "../utils/SvelthreeLogger"

	import { svelthreeStores } from "svelthree/stores"
	import { SvelthreeProps } from "../utils"

	import type { Writable } from "svelte/store"

	import { OrbitControls as THREE_OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
	import type { PropsOrbitControls } from "../types/types-comp-props"
	import { CameraHelper } from "three"
	import type {
		Vector3,
		PerspectiveCamera as THREE_PerspectiveCamera,
		OrthographicCamera as THREE_OrthographicCamera
	} from "three"
	import type { default as PerspectiveCamera } from "./PerspectiveCamera.svelte"
	import type { default as OrthographicCamera } from "./OrthographicCamera.svelte"
	import type { default as Canvas } from "../components/Canvas.svelte"

	const self = get_current_component()
	const c_name = get_comp_name(self)
	/** svelthree component's type (e.g. component `Foo` is of type 'Foo' etc.) */
	export const type: string = c_name

	const verbose: boolean = verbose_mode()

	export let log_all = false
	export let log_rs: boolean = log_all
	export let log_lc: { [P in keyof LogLC]: LogLC[P] } = log_all ? { all: true } : undefined

	let scene: THREE_Scene = getContext("scene")
	const sti: number = getContext("store_index")
	const canvas_dom: Writable<{ element: HTMLCanvasElement }> = getContext("canvas_dom")
	/** Returns the `orbitcontrols` instance created by the component & allows providing (_injection_) of (_already created / premade_) `THREE.OrbitControls` instances. */
	export let orbitcontrols: THREE_OrbitControls = undefined

	export const is_svelthree_component = true
	export const is_svelthree_orbitcontrols = true

	/** Display a console warning if the `OrbitControls` component's `cam` attribute was assigned a currently _inactive_ camera (also adss a `CameraHelper` to the assigned Camera). Default is `true`. Set `warn={false}` to hide the warning (_also: no `CameraHelper` be added_). */
	export let warn = true

	// TODO  clarify why / when we would need this.
	let index_in_orbitcontrols: number = undefined

	/** Get `OrbitControls` three.js instance's index in the `orbitcontrols`-array (svelthreeStore).
	 * Can also be obtained via created `orbitcontrols` instance directly: `orbitcontrols_comp_ref.orbitcontrols.userData.index_in_orbitcontrols`
	 */
	export const get_index_in_orbitcontrols = (): number => index_in_orbitcontrols

	export let cam: PerspectiveCamera | OrthographicCamera | THREE_PerspectiveCamera | THREE_OrthographicCamera =
		undefined
	export let dom_el: HTMLElement | Canvas = undefined

	/** mode `"auto"`: schedule render loop rAF id */
	let rAF = { id: 0 }

	// renderer (needed) updates orbitcontrols in case of damping and autorotate,
	// canvas_dom.element and activeCamera are needed for default values if no 'cam' or 'dom_el' were provided.
	$: if (!orbitcontrols && $canvas_dom?.element && $svelthreeStores[sti].activeCamera) create_orbitcontrols()

	/** `OrbitControls` are bound to a `Camera` and a `<canvas>` DOM Element,
	 * so the `OrbitControls` component can be placed anywhere in the components scene graph. */
	function create_orbitcontrols(): void {
		//console.log("create_orbitcontrols!")
		const oc_cam: THREE_PerspectiveCamera | THREE_OrthographicCamera = get_oc_cam()
		const oc_dom: HTMLElement = get_oc_dom()

		try {
			orbitcontrols = new THREE_OrbitControls(oc_cam, oc_dom)
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

			// mode 'auto'
			if ($svelthreeStores[sti].rendererComponent?.mode === "auto") {
				if (auto === true) {
					// schedule render every animation frame
					rAF.id = requestAnimationFrame(() => on_orbitcontrols_change(null))
				} else {
					// schedule render on `"change"` event
					orbitcontrols.addEventListener("change", on_orbitcontrols_change)
				}
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

	// schedule render
	function on_orbitcontrols_change(e: any): void {
		orbitcontrols.object.userData.root_scene.userData.dirty = true
		$svelthreeStores[sti].rendererComponent.schedule_render_auto(orbitcontrols.object.userData.root_scene)

		// schedule next render (loop) if function was not called by an event
		if (e === null) rAF.id = requestAnimationFrame(() => on_orbitcontrols_change(null))
	}

	function get_oc_cam(): THREE_PerspectiveCamera | THREE_OrthographicCamera {
		if (cam !== undefined && cam["is_svelthree_camera"]) {
			return (cam as PerspectiveCamera | OrthographicCamera).get_instance()
		}
		if (cam !== undefined && cam["isPerspectiveCamera"]) {
			return cam as THREE_PerspectiveCamera
		}
		if (cam !== undefined && cam["isOrthographicCamera"]) {
			return cam as THREE_OrthographicCamera
		}
		if (cam === undefined) {
			return $svelthreeStores[sti].activeCamera
		}
	}

	function get_oc_dom(): HTMLElement {
		if (dom_el !== undefined && dom_el["is_svelthree_canvas"]) {
			return (dom_el as Canvas).getDomElement()
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
	/** **shorthand** attribute for setting properties of the created / injected three.js instance via an `Object Literal`. */
	export let props: PropsOrbitControls = undefined

	$: if (!sProps && orbitcontrols && props) sProps = new SvelthreeProps(orbitcontrols)
	$: if (props && sProps) update_props()
	function update_props() {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "props", props))
		sProps.update(props)
	}

	/** When set to false, the controls will not respond to user input. Default is `true`.
	 * [See threejs-docs.](https://threejs.org/docs/#examples/en/controls/OrbitControls.enabled) */
	export let enabled = true
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
	export let rotate = true
	$: if (orbitcontrols && (rotate === true || !rotate)) set_rotate()

	function set_rotate(): void {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "rotate", rotate))
		orbitcontrols.enableRotate = !!rotate
	}

	/** Set to `true` to automatically rotate around the target. Default is `false`.
	 * - With `WebGLRenderer` component's `mode` set to `"auto"`:
	 *     - `true`: will schedule a render on every AF.
	 *     - `false`: will schedule a render on `OrbitControls`'s event `"change"`.
	 *
	 * [See threejs-docs.](https://threejs.org/docs/#examples/en/controls/OrbitControls.autoRotate) */
	export let auto = false
	$: if (orbitcontrols && auto !== undefined) set_auto()

	function set_auto(): void {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "auto", auto))
		orbitcontrols.autoRotate = !!auto

		if (!orbitcontrols.autoRotate) {
			if (rAF.id) {
				cancelAnimationFrame(rAF.id)
				rAF.id = 0
				orbitcontrols.addEventListener("change", on_orbitcontrols_change)
			}
		} else {
			if ($svelthreeStores[sti].rendererComponent?.mode === "auto") {
				orbitcontrols.removeEventListener("change", on_orbitcontrols_change)
				if (rAF.id === 0) rAF.id = requestAnimationFrame(() => on_orbitcontrols_change(null))
			}
		}
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
	export let damping = false
	$: if (orbitcontrols && (damping === true || !damping)) set_damping()

	function set_damping(): void {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "damping", damping))
		orbitcontrols.enableDamping = !!damping
	}

	/** Enable or disable camera panning. Default is `true`.
	 * [See threejs-docs.](https://threejs.org/docs/#examples/en/controls/OrbitControls.enablePan) */
	export let pan = true
	$: if (orbitcontrols && (pan === true || !pan)) set_pan()

	function set_pan(): void {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "pan", pan))
		orbitcontrols.enablePan = !!pan
	}

	/** Enable or disable zooming (dollying) of the camera. Default `false`.
	 * [See threejs-docs.](https://threejs.org/docs/#examples/en/controls/OrbitControls.enableZoom) */
	export let zoom = false
	$: if (orbitcontrols && (zoom === true || !zoom)) set_zoom()

	function set_zoom(): void {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "zoom", zoom))
		orbitcontrols.enableZoom = !!zoom
	}

	/** Returns the (three) instance of the object created by the component. */
	export const get_instance = (): THREE_OrbitControls => orbitcontrols

	/** **Completely replace** `onMount` -> any `onMount_inject_before` & `onMount_inject_after` will be ignored.
	 * _default verbosity will be gone!_ */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	export let onDestroy_inject_before: (args?: any) => any = undefined

	/** **Inject** functionality **after** component's existing `onDestroy` logic.
	 * _default verbosity not affected._ */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	export let onDestroy_inject_after: (args?: any) => any = undefined

	/** **Completely replace** `onDestroy` -> any `onDestroy_inject_before` & `onDestroy_inject_after` will be ignored.
	 * _default verbosity will be gone!_ */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	export let onDestroy_replace: (args?: any) => any = undefined

	onDestroy(
		onDestroy_replace
			? async () => onDestroy_replace(_self)
			: async () => {
					if (verbose && log_lc && (log_lc.all || log_lc.od)) {
						console.info(...c_lc(c_name, "onDestroy"))
					}

					if (onDestroy_inject_before) onDestroy_inject_before()

					if (rAF.id) cancelAnimationFrame(rAF.id)
					orbitcontrols.removeEventListener("change", on_orbitcontrols_change)

					if (onDestroy_inject_after) onDestroy_inject_after()
			  }
	)

	/** **Completely replace** `beforeUpdate` -> any `beforeUpdate_inject_before` & `beforeUpdate_inject_after` will be ignored.
	 * _default verbosity will be gone!_ */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
