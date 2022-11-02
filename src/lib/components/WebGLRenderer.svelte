<!--
`accessors:true` hast to be set per component because of the svelte-language-server bug, otherwise accessors would be falsely detected as missing and highlighted as errors.
svelthree uses svelte-accmod, where accessors are always `true`, regardless of `svelte:options`.  
-->
<svelte:options accessors />

<!-- 
@component
This is a **svelthree** _WebGLRenderer_ Component.  
[ tbd ]  Link to Docs.
-->
<script lang="ts">
	import { afterUpdate, beforeUpdate, onDestroy, createEventDispatcher, onMount, tick, getContext } from "svelte"
	import { get_current_component } from "svelte/internal"
	import { Camera, PCFSoftShadowMap, Scene, WebGLRenderer } from "three"
	import type { ShadowMapType, PerspectiveCamera, OrthographicCamera, WebGLRendererParameters } from "three"
	import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
	import { svelthreeStores } from "svelthree/stores"
	import { SvelthreeProps } from "../utils"

	import { c_rs, c_lc, c_dev, verbose_mode, get_comp_name } from "../utils/SvelthreeLogger"
	import type { LogLC, LogDEV } from "../utils/SvelthreeLogger"
	import type { Writable } from "svelte/store"
	import type { default as Canvas } from "./Canvas.svelte"
	import type { default as CubeCamera } from "./CubeCamera.svelte"
	import type {
		WebGLRendererMode,
		WebGLRendererComponentEventDispatcher,
		WebGLRendererEventDetail,
		SvelthreeLifecycleCallback
	} from "../types/types-extra"
	import type { PropsWebGLRenderer } from "../types/types-comp-props"

	type CurrentComponentType = import("./WebGLRenderer.svelte").default
	const self = get_current_component()
	const c_name = get_comp_name(self)
	/** svelthree component's type (e.g. `type` prop value of component `Foo` will be `'Foo'`) */
	export const type: string = c_name
	const verbose: boolean = verbose_mode()

	export let log_all = false
	export let log_dev: { [P in keyof LogDEV]: LogDEV[P] } = log_all ? { all: true } : undefined
	export let log_rs: boolean = log_all
	export let log_lc: { [P in keyof LogLC]: LogLC[P] } = log_all ? { all: true } : undefined

	const dispatch = createEventDispatcher<WebGLRendererComponentEventDispatcher>()

	/**
	 *  SVELTEKIT  SSR /
	 * `browser` is needed for the SvelteKit setup (SSR / CSR / SPA).
	 * For non-SSR output in RollUp only and Vite only setups (CSR / SPA) we're just mimicing `$app/environment` where `browser = true`,
	 * -> TS fix: `$app/environment` mapped to `src/$app/environment` via svelthree's `tsconfig.json`'s `path` property.
	 * -> RollUp only setup: replace `$app/environment` with `../$app/environment`
	 * The import below will work out-of-the-box in a SvelteKit setup.
	 */
	import { browser } from "$app/environment"

	/**
	 * svelthreeStore index (`sti`) spread via context.  \
	 * _will be `undefined` if the `WebGlRenderer` is placed **outside** of a `Canvas` component._
	 */
	const sti: number = getContext("store_index")

	/**
	 * Position of the `WebGLRenderer` component in the markup.
	 * - `true`: the `WebGLRenderer` component is placed **inside** of a `Canvas` component (_**can** access `store_index` via **context**_)
	 * - `false`: the `WebGLRenderer` component is placed **outside** of a `Canvas` component (_**cannot** access `store_index` via **context**_)
	 *
	 * TODO : describe handling differencies in detail ...
	 */
	let inside: boolean = undefined
	$: inside = !!sti

	interface WebGLRendererInput {
		canvas: Canvas
		scene_id: string
		cam_id: string
	}

	/**
	 * An array of configuration objects specifying `Canvas` components incl. `Scene` and `Camera` components' `id`s that should be rendered.
	 */
	export let inputs: WebGLRendererInput[] = undefined
	let inputs_processed = false
	const canvas_dom: Writable<{ element: HTMLCanvasElement }> = getContext("canvas_dom")

	// inside -> wait for canvas...
	// set canvas_dom_element to parent canvas_dom_element (canvas_dom && sti should be !== undefined)
	let canvas_dom_element: HTMLCanvasElement = undefined
	$: if (canvas_dom_element === undefined && $canvas_dom?.element && sti >= 0) {
		canvas_dom_element = $canvas_dom.element
	}

	interface WebGLRendererInputsQueueItem {
		dom_element: HTMLCanvasElement
		sti: number
		scene_id: string
		cam_id: string
		scene?: Scene
		cam?: PerspectiveCamera | OrthographicCamera
	}

	let inputs_queue: WebGLRendererInputsQueueItem[] = []

	// get canvas_dom_element from the 'canvas' attribute

	let first_inputs_canvas: Canvas = undefined
	$: if (inputs?.length && inputs[0].canvas) first_inputs_canvas = inputs[0].canvas
	$: if (inside === false && first_inputs_canvas) process_canvas_inputs()

	function process_canvas_inputs(): void {
		//console.log("process_canvas_inputs!")
		for (let i = 0; i < inputs.length; i++) {
			// if it's a canvas component, also get / set sti from it
			const input: WebGLRendererInput = inputs[i]

			if (input.canvas["is_svelthree_canvas"]) {
				inputs_queue.push({
					dom_element: (input.canvas as Canvas).getDomElement(),
					sti: (input.canvas as Canvas).get_sti(),
					scene_id: input.scene_id,
					cam_id: input.cam_id
				})
			} else {
				throw new Error(
					"SVELTHREE > WebGLRendererInput Error > the 'canvas' prop has to be a svelthree Canvas component!"
				)
			}
		}

		// get and activate specified cams and scenes
		for (let j = 0; j < inputs_queue.length; j++) {
			const queued: WebGLRendererInputsQueueItem = inputs_queue[j]
			queued.scene = get_scene_to_render(queued.sti, queued.scene_id)
			queued.cam = get_cam_to_render(queued.sti, queued.cam_id)
			activate_cam(queued.cam, queued.sti)
			activate_scene(queued.scene, queued.sti)
		}

		inputs_processed = true
	}

	interface WebGLRendererOutput {
		canvas: HTMLCanvasElement | HTMLElement
	}

	interface WebGLRendererOutputsQueueItem {
		dom_element: HTMLCanvasElement
		viewOffset?: number[]
	}

	/** An array of `Canvas` components or `<canvas>` DOM elements to rendered to. */
	export let outputs: WebGLRendererOutput[] = undefined
	let outputs_processed = false
	let first_outputs_canvas: HTMLCanvasElement | HTMLElement = undefined
	$: if (outputs?.length && outputs[0].canvas) first_outputs_canvas = outputs[0].canvas
	$: if (inside === false && first_outputs_canvas && inputs_processed) process_canvas_outputs()

	let outputs_queue: WebGLRendererOutputsQueueItem[] = []

	async function process_canvas_outputs(): Promise<void> {
		//console.log("process_canvas_outputs!")

		await tick()

		for (let i = 0; i < outputs.length; i++) {
			// if it's a canvas component, also get / set sti from it
			const output: WebGLRendererOutput = outputs[i]

			if (output.canvas instanceof HTMLCanvasElement) {
				outputs_queue.push({
					dom_element: output.canvas as HTMLCanvasElement
				})
			} else {
				throw new Error(
					"SVELTHREE > WebGLRendererOutput Error > the 'canvas' prop has to be a <canvas> DOM Element!"
				)
			}
		}

		outputs_processed = await calculate_output_viewOffset()
	}

	/**
	 * Calculate camera's `viewOffset`, see [PerspectiveCamera.setViewOffset](https://threejs.org/docs/#api/en/cameras/PerspectiveCamera.setViewOffset).
	 */
	async function calculate_output_viewOffset(): Promise<boolean> {
		const full_width: number = get_outputs_full_width()
		const full_height: number = get_outputs_full_height()

		for (let j = 0; j < outputs_queue.length; j++) {
			const output: WebGLRendererOutputsQueueItem = outputs_queue[j]

			const x: number = output.dom_element.offsetLeft
			const y: number = output.dom_element.offsetTop
			const w: number = output.dom_element.clientWidth
			const h: number = output.dom_element.clientHeight

			output.viewOffset = [full_width, full_height, x, y, w, h]
		}

		return true
	}

	function get_outputs_full_width(): number {
		const sorted_left: WebGLRendererOutputsQueueItem[] = [...outputs_queue].sort(
			(a, b) => a.dom_element.offsetLeft - b.dom_element.offsetLeft
		)
		const sorted_right: WebGLRendererOutputsQueueItem[] = [...outputs_queue].sort(
			(a, b) =>
				a.dom_element.offsetLeft +
				a.dom_element.clientWidth -
				(b.dom_element.offsetLeft + b.dom_element.clientWidth)
		)

		return (
			sorted_right[sorted_right.length - 1].dom_element.offsetLeft +
			sorted_right[sorted_right.length - 1].dom_element.clientWidth -
			sorted_left[0].dom_element.offsetLeft
		)
	}

	function get_outputs_full_height(): number {
		const sorted_top: WebGLRendererOutputsQueueItem[] = [...outputs_queue].sort(
			(a, b) => a.dom_element.offsetTop - b.dom_element.offsetTop
		)
		const sorted_bottom: WebGLRendererOutputsQueueItem[] = [...outputs_queue].sort(
			(a, b) =>
				a.dom_element.offsetTop +
				a.dom_element.clientHeight -
				(b.dom_element.offsetTop + b.dom_element.clientHeight)
		)

		return (
			sorted_bottom[sorted_bottom.length - 1].dom_element.offsetTop +
			sorted_bottom[sorted_bottom.length - 1].dom_element.clientHeight -
			sorted_top[0].dom_element.offsetTop
		)
	}

	$: if (inputs?.length && inputs_processed && (!outputs || (outputs?.length && outputs_processed))) create_renderer()

	export let params: { [P in keyof WebGLRendererParameters]: WebGLRendererParameters[P] } = undefined

	let renderer: WebGLRenderer

	// inside only -> if the `WebGLRenderer` component is placed inside a `Canvas` or a `Scene` component
	$: if (!renderer && canvas_dom_element && sti >= 0) create_renderer()

	function create_renderer(): void {
		if (verbose && log_rs) {
			console.debug(...c_rs(c_name, "create_renderer! (before creation) -> renderer:", renderer))
		}

		// 'context.drawImage( renderer.domElement, 0, 0 )' approach:
		// we're not linking the canvas_dom_element directly to the renderer.
		renderer = new WebGLRenderer({ ...params })
		renderer.setPixelRatio(window.devicePixelRatio)

		if (inputs_queue.length) {
			for (let i = 0; i < inputs_queue.length; i++) {
				$svelthreeStores[inputs_queue[i].sti].renderer = renderer
				$svelthreeStores[inputs_queue[i].sti].rendererComponent = self
			}
		} else {
			$svelthreeStores[sti].renderer = renderer
			$svelthreeStores[sti].rendererComponent = self
		}

		if (verbose && log_rs) {
			console.debug(...c_rs(c_name, "create_renderer! (after creation) -> renderer:", renderer))
		}
	}

	let sProps: SvelthreeProps

	// IMPORTANT  `props` will be overridden by 'shorthand' attributes!
	/** **shorthand** attribute for setting the `position` property of the created / injected three.js instance. */
	export let props: { [P in keyof PropsWebGLRenderer]: PropsWebGLRenderer[P] } = undefined

	$: if (!sProps && renderer && props) sProps = new SvelthreeProps(renderer)
	$: if (props && sProps) update_props()
	function update_props() {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "props", props))
		sProps.update(props)
	}

	// 'shorthand' attributes

	export let shadowmap = false
	$: if (renderer) set_ShadowMap_status()

	function set_ShadowMap_status(): void {
		renderer.shadowMap.enabled = !!shadowmap

		if (verbose && log_rs) {
			console.debug(
				...c_rs(c_name, "set_ShadowMap_status! ->", {
					shadowmap,
					"renderer.shadowMap.enabled": renderer.shadowMap.enabled
				})
			)
		}
	}

	/**
	 * see [WebGLRenderer Constants](https://threejs.org/docs/#api/en/constants/Renderer)  \
	 * see [LightShadow](https://threejs.org/docs/#api/en/lights/shadows/LightShadow)  \
	 * see [DirectionalLightShadow](https://threejs.org/docs/#api/en/lights/shadows/DirectionalLightShadow)
	 * ---
	 * - BasicShadowMap
	 * - PCFShadowMap
	 * - PCFSoftShadowMap
	 * - VSMShadowMap
	 */
	export let shadowmap_type: ShadowMapType = PCFSoftShadowMap
	$: if (renderer && renderer.shadowMap.enabled && shadowmap_type) set_ShadowMap_type()

	function set_ShadowMap_type(): void {
		renderer.shadowMap.type = shadowmap_type

		if (verbose && log_rs) {
			console.debug(
				...c_rs(c_name, "set_ShadowMap_type! -> renderer.", {
					"shadowMap.enabled": renderer.shadowMap.enabled,
					"shadowMap.type": renderer.shadowMap.type
				})
			)
		}
	}

	export let xr: boolean = undefined

	$: if (renderer) set_xr()

	function set_xr(): void {
		renderer.xr.enabled = !!xr
		if (verbose && log_rs) {
			console.debug(...c_rs(c_name, "set_xr! ->", { xr, "renderer.xr.enabled": renderer.xr.enabled }))
		}
	}

	/** `WebGLRenderer` component's prop `sceneId` -> `id` of a `Scene` component to render. */
	let scene_to_render_id: string = undefined
	export { scene_to_render_id as sceneId }
	let current_scene: Scene = undefined
	let current_scene_id = ""

	// inside only -> if the `WebGLRenderer` component is placed inside a `Canvas` or a `Scene` component
	$: if (!inputs && renderer && !current_scene && scene_to_render_id) set_current_scene()

	function set_current_scene(): void {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "set_current_scene! ->", { scene_to_render_id }))
		current_scene = get_scene_to_render(sti, scene_to_render_id)
		activate_scene(current_scene, sti)
	}

	/** `WebGLRenderer` component's prop `camId` -> `id` of a camera component to render. */
	let cam_to_render_id: string = undefined
	export { cam_to_render_id as camId }
	let current_cam: PerspectiveCamera | OrthographicCamera = undefined
	let current_cam_id = ""

	// inside only -> if the `WebGLRenderer` component is placed inside a `Canvas` or a `Scene` component
	$: if (!inputs && renderer && !current_cam && current_scene_id) set_current_cam()

	function set_current_cam(): void {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "set_current_cam! ->", { cam_to_render_id }))
		current_cam = get_cam_to_render(sti, cam_to_render_id)
		activate_cam(current_cam, sti)
	}

	// inside only -> if the `WebGLRenderer` component is placed inside a `Canvas` or a `Scene` component
	$: if (!inputs && renderer && scene_to_render_id !== current_scene_id && current_scene) {
		if (verbose && log_rs) {
			console.debug(
				...c_rs(c_name, "scene_to_render_id !== current_scene_id :", scene_to_render_id !== current_scene_id)
			)
		}

		update_current_scene()
	}

	function update_current_scene(): void {
		deactivate_scene(current_scene, sti)
		current_scene = get_scene_to_render(sti, scene_to_render_id)
		activate_scene(current_scene, sti)
	}

	// inside only -> if the `WebGLRenderer` component is placed inside a `Canvas` or a `Scene` component
	$: if (!inputs && renderer && cam_to_render_id !== current_cam_id && current_cam) {
		if (verbose && log_rs) {
			console.debug(...c_rs(c_name, "cam_to_render_id !== current_cam_id :", cam_to_render_id !== current_cam_id))
		}

		update_current_cam()
	}

	function update_current_cam(): void {
		deactivate_cam(current_cam, sti)
		current_cam = get_cam_to_render(sti, cam_to_render_id)
		activate_cam(current_cam, sti)
	}

	let resize_renderer_on_next_frame = false

	const canvas_dim: Writable<{ w: number; h: number }> = getContext("canvas_dim")

	// inside only -> if the `WebGLRenderer` component is placed inside a `Canvas` or a `Scene` component
	$: if (!inputs && renderer && ($canvas_dim?.w || $canvas_dim?.h)) {
		if (verbose && log_rs) {
			console.debug(
				...c_rs(c_name, "[TODO ???] -> if ($canvas_dim) :", {
					w: $canvas_dim.w,
					h: $canvas_dim.h
				})
			)
		}

		// resize renderer on canvas_dom_element.dim change
		resize_renderer_on_next_frame = true
	}

	/** Choose one of the `WebGLRenderer` modes:
	 * - `"auto"` (default) -> render only if something in the active scene has changed ( _the most performant mode overall_ ).
	 * - `"always"` -> render on every AnimationFrame ( _classic requestAnimationFrame loop_ )
	 */
	export let mode: WebGLRendererMode = "auto"

	// both inside and outside
	$: if (renderer && (canvas_dom_element || inputs_queue.length)) {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "renderer created -> start_renderer ...", { renderer }))
		start_renderer()
	}

	// --- Camera activation / deactivation ---

	function activate_cam(camera: PerspectiveCamera | OrthographicCamera, store_index: number) {
		camera.userData.isActive = true
		$svelthreeStores[store_index].cameras[camera.userData.index_in_cameras].isActive = true
		$svelthreeStores[store_index].activeCamera = camera
	}

	function deactivate_cam(camera: PerspectiveCamera | OrthographicCamera, store_index: number): void {
		camera.userData.isActive = false
		$svelthreeStores[store_index].cameras[camera.userData.index_in_cameras].isActive = false
	}

	function get_scene_to_render(store_index: number, scene_id: string): Scene {
		if (verbose && log_dev) console.debug(...c_dev(c_name, "get_scene_to_render!"))

		if ($svelthreeStores[store_index].scenes.length > 0) {
			if (scene_id === undefined) {
				console.warn("SVELTHREE > WebGLRenderer : You have to provide the 'sceneId' prop!", {
					sceneId: scene_id
				})
				throw new Error("SVELTHREE Exception (see warning above)")
			} else {
				for (let i = 0; i < $svelthreeStores[store_index].scenes.length; i++) {
					let item = $svelthreeStores[store_index].scenes[i]

					if (item.id === scene_id) {
						current_scene_id = scene_id
						return item.scene
					}
				}

				console.warn("SVELTHREE > WebGLRenderer : Scene with id '" + scene_id + "' not found!", {
					scenes: $svelthreeStores[store_index].scenes
				})
				throw new Error("SVELTHREE Exception (see warning above)")
			}
		} else {
			console.warn("SVELTHREE > WebGLRenderer : get_scene_to_render: No Scenes available!", {
				scenes: $svelthreeStores[store_index].scenes
			})
			throw new Error("SVELTHREE Exception (see warning above)")
		}
	}

	function get_cam_to_render(store_index: number, cam_id: string): PerspectiveCamera | OrthographicCamera {
		if (verbose && log_dev) console.debug(...c_dev(c_name, "get_cam_to_render!"))
		if ($svelthreeStores[store_index].cameras.length > 0) {
			if (cam_id === undefined) {
				console.warn("SVELTHREE > WebGLRenderer : You have to provide the 'camId' prop!", {
					camId: cam_id
				})
				throw new Error("SVELTHREE Exception (see warning above)")
			} else {
				for (let i = 0; i < $svelthreeStores[store_index].cameras.length; i++) {
					let item = $svelthreeStores[store_index].cameras[i]
					if (item.id === cam_id) {
						current_cam_id = cam_id
						return item.camera
					}
				}

				console.warn("SVELTHREE > WebGLRenderer : Camera with id '" + cam_id + "' not found!", {
					cameras: $svelthreeStores[store_index].cameras
				})
				throw new Error("SVELTHREE Exception (see warning above)")
			}
		} else {
			console.warn(
				"SVELTHREE > WebGLRenderer : get_cam_to_render: No Cameras available! $svelthreeStores[store_index].cameras:",
				{ cameras: $svelthreeStores[store_index].cameras }
			)
			throw new Error("SVELTHREE Exception (see warning above)")
		}
	}

	function activate_scene(scene: Scene, sti: number): void {
		if (scene.userData.isActive === undefined) {
			if (verbose && log_dev) {
				console.debug(
					...c_dev(c_name, "activate_scene! -> if (scene.userData.isActive === undefined) :", {
						scene
					})
				)
			}
		}

		scene.userData.isActive = true
		$svelthreeStores[sti].scenes[scene.userData.index_in_scenes].isActive = true
		$svelthreeStores[sti].activeScene = scene
		$svelthreeStores[sti].currentSceneIndex = scene.userData.index_in_scenes + 1
	}

	function deactivate_scene(scene: Scene, store_index: number): void {
		if (scene.userData.isActive === true) {
			scene.userData.isActive = false
			$svelthreeStores[store_index].activeScene = undefined
			$svelthreeStores[store_index].scenes[scene.userData.index_in_scenes].isActive = false
		}
	}

	// IMPORTANT  avoid component updates if not neccessary by e.g. putting values into
	// **NOT** EXPORTED top-level objects -> EXPORTED top-level objects will be reactive due to `svelte-accmod`!
	const rAF = { id: undefined }
	const frames = { total: 0 }

	export let enabled = true

	function start_renderer(): void {
		if (verbose && log_dev) console.debug(...c_dev(c_name, "start_renderer!"))

		if (renderer.xr.enabled === false) {
			if (mode === "always") schedule_render_always()
			if (mode === "auto") rAF.id = requestAnimationFrame(render_standard)
		} else {
			throw new Error("SVELTHREE > You're using the non-XR svelthree version!")
		}
	}

	let log_once = true

	function do_log_once(render_mode: string): void {
		log_once = false
		if (verbose && log_dev)
			console.warn(
				...c_dev(c_name, `"SVELTHREE -> WebGLRenderer -> render_standard, mode:": ${render_mode}`, {
					current_scene,
					current_cam,
					canvas_dom_element
				})
			)
	}

	/**
	 * Dispatches a custom event via component's dispatcher, see `dispatch`.
	 * - Added as an alternative to calling `dispatch` directly in order to reduce anonnymous function calls count in the stack trace.
	 * Every `dispatch(...)` call is creating a new custom event, calling `createEventDispatcher` alone shows two anonnymous functions in the stack trace.
	 */
	async function dispatch_render_event(event_name: string, detail: WebGLRendererEventDetail = null): Promise<void> {
		detail ? dispatch(event_name, detail) : dispatch(event_name)
	}

	async function render_standard(): Promise<void> {
		if (enabled) {
			// if the `current_cam` instance is not being managed by a component (anymore),
			// it means a new (premade) camera instance was injected via `camera` attribute,
			// so the `current_cam` reference needs to be updated.
			if (current_cam) {
				if (!current_cam.userData.svelthreeComponent) set_current_cam()
			}

			if (log_once) do_log_once(mode)

			// process
			await svelthree_extra()
			await tick()
			await svelthree_rendering()
			await tick()

			frames.total++

			await dispatch_render_event("after_render", { frame: frames.total })

			if (mode === "auto") render_scheduled.status = false
		}
	}

	async function svelthree_extra(): Promise<void> {
		await dispatch_render_event("before_render", { frame: frames.total })
		await dispatch_render_event("before_render_int", { frame: frames.total })
		await dispatch_render_event("before_render_scene", { frame: frames.total })

		// TODO  the comment below is very old, check / nail it down 100%!
		// VERY IMPORTANT  THREE  SVELTE :
		// inserting await tick() here enables cross-referencing:
		await tick()

		if ($svelthreeStores[sti] && $svelthreeStores[sti].canvas.interactive) {
			// filter interactive objects in currently active (rendered) scene
			await dispatch_render_event("interaction_0")

			// update raycaster intersections and cursor appearance (_if `canvas_comp.change_cursor = true`_)
			await dispatch_render_event("interaction_1")

			if (mode === "always") {
				// fire any queued pointer interactivity
				await dispatch_render_event("interaction_2")

				// fire any queued focus / keyboard interactivity
				await dispatch_render_event("interaction_3")
			}
		}

		// will currently update box-helpers only
		await dispatch_render_event("update_helpers")

		// update OrbitControls (NonXR)
		// required if `enableDamping` or `autoRotate` are set to `true`
		if (inputs_queue.length) {
			for (let i = 0; i < inputs_queue.length; i++) {
				const queued = inputs_queue[i]
				const sti = queued.sti

				if ($svelthreeStores[sti].orbitcontrols.length) {
					for (let i = 0; i < $svelthreeStores[sti].orbitcontrols.length; i++) {
						const oc: OrbitControls = $svelthreeStores[sti].orbitcontrols[i]
						if (oc.autoRotate || oc.enableDamping) oc.update()
					}
				}
			}
		} else {
			if ($svelthreeStores[sti].orbitcontrols.length) {
				for (let i = 0; i < $svelthreeStores[sti].orbitcontrols.length; i++) {
					const oc: OrbitControls = $svelthreeStores[sti].orbitcontrols[i]
					if (oc.autoRotate || oc.enableDamping) oc.update()
				}
			}
		}

		// update CubeCameras
		if (inputs_queue.length) {
			for (let i = 0; i < inputs_queue.length; i++) {
				const queued = inputs_queue[i]
				const sti = queued.sti

				if ($svelthreeStores[sti].cubeCameras.length) {
					for (let i = 0; i < $svelthreeStores[sti].cubeCameras.length; i++) {
						const cubecam: CubeCamera = $svelthreeStores[sti].cubeCameras[i]
						if (cubecam.dynamic) {
							cubecam.update_cubecam()
						}
					}
				}
			}
		} else {
			if ($svelthreeStores[sti].cubeCameras.length) {
				for (let i = 0; i < $svelthreeStores[sti].cubeCameras.length; i++) {
					const cubecam: CubeCamera = $svelthreeStores[sti].cubeCameras[i]
					if (cubecam.dynamic) {
						cubecam.update_cubecam()
					}
				}
			}
		}
	}

	async function svelthree_rendering(): Promise<void> {
		if (inputs_queue.length) {
			// outside only -> if the `WebGLRenderer` component is placed outside of a `Canvas` component
			for (let i = 0; i < inputs_queue.length; i++) {
				const inp = inputs_queue[i]
				// inside should be false if inputs_queue.length
				if (!outputs_queue?.length && inside === false) {
					renderer.setSize(inp.dom_element.width, inp.dom_element.height)
				}

				if (outputs_queue?.length) {
					for (let j = 0; j < outputs_queue.length; j++) {
						const out = outputs_queue[j]

						inp.cam.setViewOffset(
							out.viewOffset[0],
							out.viewOffset[1],
							out.viewOffset[2],
							out.viewOffset[3],
							out.viewOffset[4],
							out.viewOffset[5]
						)
						renderer.setSize(out.viewOffset[4], out.viewOffset[5])
						renderer.render(inp.scene, inp.cam)

						const context = out.dom_element.getContext("2d")
						context.drawImage(renderer.domElement, 0, 0)
						inp.cam.clearViewOffset()
					}
				} else {
					renderer.render(inp.scene, inp.cam)
					const context = inp.dom_element.getContext("2d")
					context.drawImage(renderer.domElement, 0, 0)
				}
			}
		} else {
			// inside only -> if the `WebGLRenderer` component is placed inside a `Canvas` or a `Scene` component
			if (resize_renderer_on_next_frame) {
				renderer.setSize($canvas_dim.w, $canvas_dim.h, true)
				resize_renderer_on_next_frame = false
			}

			renderer.render(current_scene, current_cam)
			const context = canvas_dom_element.getContext("2d")
			context.drawImage(renderer.domElement, 0, 0)
		}
	}

	export const render_scheduled: { status: boolean } = { status: false }

	/**
	 * Schedules a render if the current scene has been marked as `dirty`. \
	 * _Primarly called internally by components if `WebGLRenderer` component's `mode` is set to `"auto"`_.
	 */
	export const schedule_render_auto = (scene: Scene = null): void => {
		if (enabled && render_scheduled.status === false) {
			const scene_to_check: Scene = scene ? scene : current_scene
			if (scene_to_check) {
				if (scene_to_check && scene_to_check.userData.dirty) {
					scene_to_check.userData.dirty = false
					rAF.id = requestAnimationFrame(render_standard)
					render_scheduled.status = true
				}
			} else {
				console.error(
					"SVELTHREE > WebGLRenderer > schedule_render_auto : no scene to check 'dirty' status available!"
				)
			}
		}
	}

	/**
	 * Starts a render loop. Current scene doesn't have to be marked as `dirty`. \
	 * _Called by the `start_renderer()` function if `WebGLRenderer` component's `mode` is set to `"always"`_.
	 */
	function schedule_render_always(): void {
		if (enabled) {
			rAF.id = requestAnimationFrame(async () => {
				await render_standard()
				schedule_render_always()
			})
		}
	}

	// public methods

	// TODO  this has to be tested / used / optimized (_isn't used in any of the test scenes up to date_)
	/** Cancel any scheduled `requestAnimationFrame` and disable further rendering. */
	export const stop_rendering = (): void => {
		enabled = false
		cancelAnimationFrame(rAF.id)
		render_scheduled.status = false
	}

	// TODO  this has to be tested / used / optimized (_isn't used in any of the test scenes up to date_)
	/** Cancel any scheduled `requestAnimationFrame` and disable further rendering. */
	export const start_rendering = (): void => {
		enabled = true
		start_renderer()
	}

	// TODO  this has to be further tested / used / optimized (_which use cases, pitfalls etc._)
	/**
	 * Schedules a render once on next AnimationFrame. Current scene doesn't have to be marked as `dirty`. \
	 * _For scheduling a render **manually** in an e.g. animation function_.
	 */
	export const schedule_render = (): void => {
		if (enabled) {
			if (rAF.id) cancelAnimationFrame(rAF.id)
			rAF.id = requestAnimationFrame(render_standard)
		}
	}

	/** Returns the **three.js instance** of the renderer. */
	export const get_renderer = (): WebGLRenderer => {
		return renderer
	}

	/** Returns the **three.js instance** of `Camera` currently used by the renderer. */
	export const get_current_camera = (): Camera => {
		return current_cam
	}

	/** Get the total number of currently rendered frames. */
	export const get_current_frame = (): number => {
		return frames.total
	}

	// TODO  different?

	export const set_render = (parameters = { sceneId: "", camId: "" }): void => {
		scene_to_render_id = parameters.sceneId
		cam_to_render_id = parameters.camId
	}

	/** **Completely replace** `svelthree`-component's default `onMount`-callback logic, any `onMountStart` & `onMountEnd` logic will be ignored (_default verbosity will be gone_).
	 *
	 * **Accepts** a `SvelthreeLifecycleCallback<T>`-type function as a **value**, which can also be explicitly typed as a **synchronous** (_type `SvelthreeLifecycleCallbackSync<T>`_) or an **asynchronous** (_type `SvelthreeLifecycleCallbackAsync<T>`_) callback:
	 * ```ts
	 * (comp: T) => unknown | Promise<unknown>
	 * ```
	 * ☝️ _the **callback's argument** (`comp`) will be the actual **`svelthree`-component's instance reference**_. */
	export let onMountReplace: SvelthreeLifecycleCallback<CurrentComponentType> = undefined

	onMount(
		onMountReplace
			? () => onMountReplace(self)
			: async () => {
					if (verbose && log_lc && (log_lc.all || log_lc.om)) {
						console.info(...c_lc(c_name, "onMount"))
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
	export let onDestroyStart: SvelthreeLifecycleCallback<CurrentComponentType> = undefined

	/** **Inject** functionality at the **end** of `svelthree`-component's default `onDestroy`-callback logic (`asynchronous`).
	 * Only asynchronous functions will be `await`ed. (_default verbosity will not be affected_)
	 *
	 * **Accepts** a `SvelthreeLifecycleCallback<T>`-type function as a **value**, which can also be explicitly typed as a **synchronous** (_type `SvelthreeLifecycleCallbackSync<T>`_) or an **asynchronous** (_type `SvelthreeLifecycleCallbackAsync<T>`_) callback:
	 * ```ts
	 * (comp: T) => unknown | Promise<unknown>
	 * ```
	 * ☝️ _the **callback's argument** (`comp`) will be the actual **`svelthree`-component's instance reference**_. */
	export let onDestroyEnd: SvelthreeLifecycleCallback<CurrentComponentType> = undefined

	/** **Completely replace** `svelthree`-component's default `onDestroy`-callback logic, any `onDestroyStart` & `onDestroyEnd` logic will be ignored (_default verbosity will be gone_).
	 *
	 * **Accepts** a `SvelthreeLifecycleCallback<T>`-type function as a **value**, which can also be explicitly typed as a **synchronous** (_type `SvelthreeLifecycleCallbackSync<T>`_) or an **asynchronous** (_type `SvelthreeLifecycleCallbackAsync<T>`_) callback:
	 * ```ts
	 * (comp: T) => unknown | Promise<unknown>
	 * ```
	 * ☝️ _the **callback's argument** (`comp`) will be the actual **`svelthree`-component's instance reference**_. */
	export let onDestroyReplace: SvelthreeLifecycleCallback<CurrentComponentType> = undefined

	onDestroy(
		onDestroyReplace
			? () => onDestroyReplace(self)
			: async () => {
					if (verbose && log_lc && (log_lc.all || log_lc.od)) {
						console.info(...c_lc(c_name, "onDestroy"))
					}

					if (onDestroyStart) {
						if (onDestroyStart.constructor.name === "AsyncFunction") {
							await onDestroyStart(self)
						} else {
							onDestroyStart(self)
						}
					}

					// SVELTEKIT  SSR /
					if (browser) {
						stop_rendering()
						renderer.dispose()
						renderer.forceContextLoss()
					}

					if (onDestroyEnd) {
						if (onDestroyEnd.constructor.name === "AsyncFunction") {
							await onDestroyEnd(self)
						} else {
							onDestroyEnd(self)
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
	export let beforeUpdateReplace: SvelthreeLifecycleCallback<CurrentComponentType> = undefined

	beforeUpdate(
		beforeUpdateReplace
			? () => beforeUpdateReplace(self)
			: async () => {
					if (verbose && log_lc && (log_lc.all || log_lc.bu)) {
						console.info(...c_lc(c_name, "beforeUpdate"))
					}
			  }
	)

	/** **Completely replace** `svelthree`-component's default `afterUpdate`-callback logic, any `afterUpdateStart` & `afterUpdateEnd` logic will be ignored (_default verbosity will be gone_).
	 *
	 * **Accepts** a `SvelthreeLifecycleCallback<T>`-type function as a **value**, which can also be explicitly typed as a **synchronous** (_type `SvelthreeLifecycleCallbackSync<T>`_) or an **asynchronous** (_type `SvelthreeLifecycleCallbackAsync<T>`_) callback:
	 * ```ts
	 * (comp: T) => unknown | Promise<unknown>
	 * ```
	 * ☝️ _the **callback's argument** (`comp`) will be the actual **`svelthree`-component's instance reference**_. */
	export let afterUpdateReplace: SvelthreeLifecycleCallback<CurrentComponentType> = undefined

	afterUpdate(
		afterUpdateReplace
			? () => afterUpdateReplace(self)
			: async () => {
					if (verbose && log_lc && (log_lc.all || log_lc.au)) {
						console.info(...c_lc(c_name, "afterUpdate"))
					}
			  }
	)
</script>
