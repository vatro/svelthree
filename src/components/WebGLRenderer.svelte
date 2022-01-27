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
	import { afterUpdate, beforeUpdate, createEventDispatcher, onMount, tick, getContext } from "svelte"
	import { get_current_component, SvelteComponentDev } from "svelte/internal"
	import { self as _self } from "svelte/internal"
	import { Camera, PCFSoftShadowMap, Scene, WebGLRenderer } from "three"
	import type { XRFrame, XRSession, ShadowMapType, PerspectiveCamera, OrthographicCamera } from "three"
	import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
	import { svelthreeStores } from "../stores"
	import { Propeller, PropUtils } from "../utils"

	import { c_rs, c_lc, c_dev, verbose_mode, get_comp_name } from "../utils/SvelthreeLogger"
	import type { LogLC, LogDEV } from "../utils/SvelthreeLogger"
	import type { Writable } from "svelte/store"
	import type { default as Canvas } from "./Canvas.svelte"

	const self = get_current_component()
	const c_name = get_comp_name(self)
	const verbose: boolean = verbose_mode()

	export let log_all: boolean = false
	export let log_dev: { [P in keyof LogDEV]: LogDEV[P] } = log_all ? { all: true } : undefined
	export let log_rs: boolean = log_all
	export let log_lc: { [P in keyof LogLC]: LogLC[P] } = log_all ? { all: true } : undefined
	export let log_mau: boolean = log_all

	let inside: boolean = undefined

	let dispatch: (type: string, detail?: any) => void = createEventDispatcher()

	export function getDispatcher(): any {
		return dispatch
	}

	/** using context ... TODO  CHECK: We want to keep the ability to pass 'sti' to a WebGLRenderer component in order to be able to render some other Canvas with the (different sti). */
	let sti: number = undefined
	// will be 'undefined' if the 'WebGlRenderer' component is out of scene graph
	let store_index: number = getContext("store_index")

	// we're INSIDE scene graph (got context -> store_index)
	$: if (store_index !== undefined) {
		sti = store_index
		inside = true
	} else {
		inside = false
	}

	interface WebGLRendererInput {
		canvas: Canvas
		scene_id: string
		cam_id: string
	}

	// will be 'undefined' if the 'WebGlRenderer' component is out of scene graph
	/** Canvas component or a Canvas Dom element where the scene / camera setup should be rendered */
	export let inputs: WebGLRendererInput[] = undefined
	let inputs_processed: boolean = false
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

	// wait for
	function process_canvas_inputs() {
		console.log("process_canvas_inputs!")
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
			queued.scene = get_sceneToRender_2(queued.sti, queued.scene_id)
			queued.cam = get_camToRender_2(queued.sti, queued.cam_id)
			activate_currentCam_2(queued.cam, queued.sti)
			activate_currentScene_2(queued.scene, queued.sti)
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

	export let outputs: WebGLRendererOutput[] = undefined
	let outputs_processed: boolean = false
	let first_outputs_canvas: HTMLCanvasElement | HTMLElement = undefined
	$: if (outputs?.length && outputs[0].canvas) first_outputs_canvas = outputs[0].canvas
	$: if (inside === false && first_outputs_canvas && inputs_processed) process_canvas_outputs()

	let outputs_queue: WebGLRendererOutputsQueueItem[] = []

	async function process_canvas_outputs() {
		console.log("process_canvas_outputs!")

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

		// calculate camera view offset, see: https://threejs.org/docs/#api/en/cameras/PerspectiveCamera.setViewOffset
		const fullWidth: number = get_outputs_full_width()
		const fullHeight: number = get_outputs_full_height()

		for (let j = 0; j < outputs_queue.length; j++) {
			
			const output: WebGLRendererOutputsQueueItem = outputs_queue[j]

			const x:number = output.dom_element.offsetLeft
			const y:number = output.dom_element.offsetTop
			const w:number = output.dom_element.clientWidth
			const h:number = output.dom_element.clientHeight

			output.viewOffset = [fullWidth, fullHeight, x, y, w, h]
		}

		outputs_processed = true
	}

	function get_outputs_full_width(): number {
		const sorted_left: WebGLRendererOutputsQueueItem[] = [...outputs_queue].sort((a, b) => a.dom_element.offsetLeft - b.dom_element.offsetLeft)
		const sorted_right: WebGLRendererOutputsQueueItem[] = [...outputs_queue].sort((a, b) => (a.dom_element.offsetLeft + a.dom_element.clientWidth) - (b.dom_element.offsetLeft + b.dom_element.clientWidth))

		return ((sorted_right[sorted_right.length - 1].dom_element.offsetLeft + sorted_right[sorted_right.length - 1].dom_element.clientWidth) - sorted_left[0].dom_element.offsetLeft)
	}

	function get_outputs_full_height(): number {
		const sorted_top: WebGLRendererOutputsQueueItem[] = [...outputs_queue].sort((a, b) => a.dom_element.offsetTop - b.dom_element.offsetTop)
		const sorted_bottom: WebGLRendererOutputsQueueItem[] = [...outputs_queue].sort((a, b) => (a.dom_element.offsetTop + a.dom_element.clientHeight) - (b.dom_element.offsetTop + b.dom_element.clientHeight))

		return ((sorted_bottom[sorted_bottom.length - 1].dom_element.offsetTop + sorted_bottom[sorted_bottom.length - 1].dom_element.clientHeight) - sorted_top[0].dom_element.offsetTop)
	}

	$: if (inputs?.length && inputs_processed && (!outputs || outputs?.length && outputs_processed)) create_renderer()

	export let config: { [key: string]: any } = undefined

	let renderer: WebGLRenderer

	// only inside
	$: if (!renderer && canvas_dom_element && sti >= 0) create_renderer()

	function create_renderer(): void {
		if (verbose && log_rs) {
			console.debug(...c_rs(c_name, "create_renderer! (before creation) -> renderer:", renderer))
		}

		// 'context.drawImage( renderer.domElement, 0, 0 )' approach:
		// we're not linking the canvas_dom_element directly to the renderer.
		renderer = new WebGLRenderer({ ...config })
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

	export let enableShadowMap = false
	$: if (renderer) set_ShadowMap_status()

	function set_ShadowMap_status() {
		renderer.shadowMap.enabled = enableShadowMap ? true : false

		if (verbose && log_rs) {
			console.debug(
				...c_rs(c_name, "set_ShadowMap_status! ->", {
					enableShadowMap,
					"renderer.shadowMap.enabled": renderer.shadowMap.enabled
				})
			)
		}
	}

	/*
     @see https://threejs.org/docs/#api/en/constants/Renderer
     @see https://threejs.org/docs/#api/en/lights/shadows/LightShadow
     @see https://threejs.org/docs/#api/en/lights/shadows/DirectionalLightShadow
     
     THREE.BasicShadowMap
     THREE.PCFShadowMap
     THREE.PCFSoftShadowMap
     THREE.VSMShadowMap
    */
	export let shadowMapType: ShadowMapType = PCFSoftShadowMap
	$: if (renderer && renderer.shadowMap.enabled && shadowMapType) set_ShadowMap_type()

	function set_ShadowMap_type() {
		renderer.shadowMap.type = shadowMapType

		if (verbose && log_rs) {
			console.debug(
				...c_rs(c_name, "set_ShadowMap_type! -> renderer.", {
					"shadowMap.enabled": renderer.shadowMap.enabled,
					"shadowMap.type": renderer.shadowMap.type
				})
			)
		}
	}

	// props object can be filled with anything, ideally available THREE props of course.
	export let props: { [key: string]: any } = undefined
	let propsPrev: typeof props = undefined
	$: if (renderer && props) update_props()

	function update_props() {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "update_props! ->", { props }))

		// TODO  refactor
		if (propsPrev === undefined) {
			const allKeys = Object.keys(props)
			PropUtils.updateProps(allKeys, props, Propeller.update, renderer)
			propsPrev = { ...props }
		} else {
			const keysOfChangedProps = PropUtils.getChangedKeys(props, propsPrev)
			PropUtils.updateProps(keysOfChangedProps, props, Propeller.update, renderer)
			propsPrev = { ...props }
		}
	}

	export let xr: boolean = undefined

	$: if (renderer) set_xr()

	function set_xr() {
		renderer.xr.enabled = xr ? true : false
		if (verbose && log_rs) {
			console.debug(...c_rs(c_name, "set_xr! ->", { xr, "renderer.xr.enabled": renderer.xr.enabled }))
		}
	}

	let sceneToRenderId: string = undefined
	export { sceneToRenderId as sceneId }
	let currentScene: Scene = undefined
	let currentSceneId = ""

	// inside only
	$: if (!inputs && renderer && !currentScene && sceneToRenderId) set_currentScene()

	function set_currentScene() {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "set_currentScene! ->", { sceneToRenderId }))
		currentScene = get_sceneToRender()
		activate_currentScene()
	}

	let camToRenderId: string = undefined
	export { camToRenderId as camId }
	let currentCam: PerspectiveCamera | OrthographicCamera = undefined
	let currentCamId = ""

	// inside only
	$: if (!inputs && renderer && !currentCam && currentSceneId) set_currentCam()

	function set_currentCam() {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "set_currentCam! ->", { camToRenderId }))
		currentCam = get_camToRender()
		activate_currentCam()
	}

	// inside only
	$: if (!inputs && renderer && sceneToRenderId !== currentSceneId) {
		if (verbose && log_rs) {
			console.debug(
				...c_rs(
					c_name,
					"[TODO ???] -> sceneToRenderId !== currentSceneId :",
					sceneToRenderId !== currentSceneId
				)
			)
		}
	}

	// won't trigger change if 'currentScene' is not being set, this happens first time onMount()

	// inside only
	$: if (!inputs && currentScene) {
		deactivate_currentScene()
		currentScene = get_sceneToRender()
		activate_currentScene()
	} else {
		//console.warn("SVELTHREE > WebGLRenderer : handle scene switch triggered, currentScene was NOT CHANGED:", {currentScene: currentScene})
	}

	// inside only
	$: if (!inputs && renderer && camToRenderId !== currentCamId) {
		if (verbose && log_rs) {
			console.debug(
				...c_rs(c_name, "[TODO ???] -> camToRenderId !== currentCamId :", camToRenderId !== currentCamId)
			)
		}
		// won't trigger change if 'currentCam' is not being set, this happens first time onMount()
		if (currentCam) {
			currentCam ? (set_currentCamInactive(), (currentCam = get_camToRender()), activate_currentCam()) : null
		} else {
			//console.warn("SVELTHREE > WebGLRenderer : handle scene switch triggered, currentCam was NOT CHANGED:", {currentCam: currentCam})
		}
	}

	let resizeRendererOnNextFrame = false

	const canvas_dim: Writable<{ w: number; h: number }> = getContext("canvas_dim")

	// only inside
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
		resizeRendererOnNextFrame = true
	}

	// TODO  auto-animate! (render only if something changed!)

	// both inside and outside
	$: if (renderer && (canvas_dom_element || inputs_queue.length)) {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "renderer created -> start_animating ...", { renderer }))
		start_animating()
	}

	function activate_currentCam(): void {
		if (verbose && log_dev) {
			console.debug(
				...c_dev(c_name, "activate_currentCam! (before) ->", {
					currentCam: currentCam.type,
					uuid: currentCam.uuid,
					isActive: currentCam.userData.isActive
				})
			)
		}

		currentCam.userData.isActive = true
		$svelthreeStores[sti].cameras[currentCam.userData.index_in_cameras].isActive = true
		$svelthreeStores[sti].activeCamera = currentCam

		if (verbose && log_dev) {
			console.debug(
				...c_dev(c_name, "activate_currentCam! (done) ->", {
					currentCam: currentCam.type,
					uuid: currentCam.uuid,
					isActive: currentCam.userData.isActive
				})
			)
		}
	}

	function activate_currentCam_2(currentCam: PerspectiveCamera | OrthographicCamera, sti: number): void {
		if (verbose && log_dev) {
			console.debug(
				...c_dev(c_name, "activate_currentCam! (before) ->", {
					currentCam: currentCam.type,
					uuid: currentCam.uuid,
					isActive: currentCam.userData.isActive
				})
			)
		}

		currentCam.userData.isActive = true
		$svelthreeStores[sti].cameras[currentCam.userData.index_in_cameras].isActive = true
		$svelthreeStores[sti].activeCamera = currentCam

		if (verbose && log_dev) {
			console.debug(
				...c_dev(c_name, "activate_currentCam! (done) ->", {
					currentCam: currentCam.type,
					uuid: currentCam.uuid,
					isActive: currentCam.userData.isActive
				})
			)
		}
	}

	function set_currentCamInactive(): void {
		if (verbose && log_dev) {
			console.debug(
				...c_dev(c_name, "set_currentCamInactive! (before) ->", {
					currentCam: currentCam.type,
					uuid: currentCam.uuid,
					isActive: currentCam.userData.isActive
				})
			)
		}

		currentCam.userData.isActive = false
		$svelthreeStores[sti].cameras[currentCam.userData.index_in_cameras].isActive = false

		if (verbose && log_dev) {
			console.debug(
				...c_dev(c_name, "activate_currentCam! (done) ->", {
					currentCam: currentCam.type,
					uuid: currentCam.uuid,
					isActive: currentCam.userData.isActive
				})
			)
		}
	}

	function get_sceneToRender(): Scene {
		if (verbose && log_dev) console.debug(...c_dev(c_name, "get_sceneToRender!"))
		if ($svelthreeStores[sti].scenes.length > 0) {
			if (sceneToRenderId === undefined) {
				console.warn("SVELTHREE > WebGLRenderer : You have to provide the 'sceneId' prop!", {
					sceneId: sceneToRenderId
				})
				throw new Error("SVELTHREE Exception (see warning above)")
			} else {
				for (let i = 0; i < $svelthreeStores[sti].scenes.length; i++) {
					let item = $svelthreeStores[sti].scenes[i]

					if (item.id === sceneToRenderId) {
						currentSceneId = sceneToRenderId
						return item.scene
					}
				}

				console.warn("SVELTHREE > WebGLRenderer : Scene with id '" + sceneToRenderId + "' not found!", {
					scenes: $svelthreeStores[sti].scenes
				})
				throw new Error("SVELTHREE Exception (see warning above)")
			}
		} else {
			console.warn("SVELTHREE > WebGLRenderer : get_sceneToRender: No Scenes available!", {
				scenes: $svelthreeStores[sti].scenes
			})
			throw new Error("SVELTHREE Exception (see warning above)")
		}
	}

	function get_sceneToRender_2(sti: number, sceneToRenderId: string): Scene {
		if (verbose && log_dev) console.debug(...c_dev(c_name, "get_sceneToRender_2!"))
		if ($svelthreeStores[sti].scenes.length > 0) {
			if (sceneToRenderId === undefined) {
				console.warn("SVELTHREE > WebGLRenderer : You have to provide the 'sceneId' prop!", {
					sceneId: sceneToRenderId
				})
				throw new Error("SVELTHREE Exception (see warning above)")
			} else {
				for (let i = 0; i < $svelthreeStores[sti].scenes.length; i++) {
					let item = $svelthreeStores[sti].scenes[i]

					if (item.id === sceneToRenderId) {
						currentSceneId = sceneToRenderId
						return item.scene
					}
				}

				console.warn("SVELTHREE > WebGLRenderer : Scene with id '" + sceneToRenderId + "' not found!", {
					scenes: $svelthreeStores[sti].scenes
				})
				throw new Error("SVELTHREE Exception (see warning above)")
			}
		} else {
			console.warn("SVELTHREE > WebGLRenderer : get_sceneToRender: No Scenes available!", {
				scenes: $svelthreeStores[sti].scenes
			})
			throw new Error("SVELTHREE Exception (see warning above)")
		}
	}

	function get_camToRender(): PerspectiveCamera | OrthographicCamera {
		if (verbose && log_dev) console.debug(...c_dev(c_name, "get_camToRender!"))
		if ($svelthreeStores[sti].cameras.length > 0) {
			if (camToRenderId === undefined) {
				console.warn("SVELTHREE > WebGLRenderer : You have to provide the 'camId' prop!", {
					camId: camToRenderId
				})
				throw new Error("SVELTHREE Exception (see warning above)")
			} else {
				for (let i = 0; i < $svelthreeStores[sti].cameras.length; i++) {
					let item = $svelthreeStores[sti].cameras[i]
					if (item.id === camToRenderId) {
						currentCamId = camToRenderId
						return item.camera
					}
				}

				console.warn("SVELTHREE > WebGLRenderer : Camera with id '" + camToRenderId + "' not found!", {
					cameras: $svelthreeStores[sti].cameras
				})
				throw new Error("SVELTHREE Exception (see warning above)")
			}
		} else {
			console.warn(
				"SVELTHREE > WebGLRenderer : get_camToRender: No Cameras available! $svelthreeStores[sti].cameras:",
				{ cameras: $svelthreeStores[sti].cameras }
			)
			throw new Error("SVELTHREE Exception (see warning above)")
		}
	}

	function get_camToRender_2(sti: number, camToRenderId: string): PerspectiveCamera | OrthographicCamera {
		if (verbose && log_dev) console.debug(...c_dev(c_name, "get_camToRender_2!"))
		if ($svelthreeStores[sti].cameras.length > 0) {
			if (camToRenderId === undefined) {
				console.warn("SVELTHREE > WebGLRenderer : You have to provide the 'camId' prop!", {
					camId: camToRenderId
				})
				throw new Error("SVELTHREE Exception (see warning above)")
			} else {
				for (let i = 0; i < $svelthreeStores[sti].cameras.length; i++) {
					let item = $svelthreeStores[sti].cameras[i]
					if (item.id === camToRenderId) {
						currentCamId = camToRenderId
						return item.camera
					}
				}

				console.warn("SVELTHREE > WebGLRenderer : Camera with id '" + camToRenderId + "' not found!", {
					cameras: $svelthreeStores[sti].cameras
				})
				throw new Error("SVELTHREE Exception (see warning above)")
			}
		} else {
			console.warn(
				"SVELTHREE > WebGLRenderer : get_camToRender: No Cameras available! $svelthreeStores[sti].cameras:",
				{ cameras: $svelthreeStores[sti].cameras }
			)
			throw new Error("SVELTHREE Exception (see warning above)")
		}
	}

	function deactivate_currentScene(): void {
		if (currentScene.userData.isActive === true) {
			currentScene.userData.isActive = false
			$svelthreeStores[sti].activeScene = undefined
			$svelthreeStores[sti].scenes[currentScene.userData.index_in_scenes].isActive = false
		}
	}

	// TODO  / TOFIX  CHECK: this should be possible simpler. ( current approach seems to have something to do with resuming animations (?) (old approach?)...)
	function activate_currentScene(): void {
		// resume animations only if scene was being deactivated before
		if (currentScene.userData.isActive === false) {
			currentScene.userData.isActive = true
			$svelthreeStores[sti].scenes[currentScene.userData.index_in_scenes].isActive = true
			$svelthreeStores[sti].activeScene = currentScene
			$svelthreeStores[sti].currentSceneIndex = currentScene.userData.index_in_scenes + 1
		} else if (currentScene.userData.isActive === undefined) {
			if (verbose && log_dev) {
				console.debug(
					...c_dev(c_name, "activate_currentScene! -> if (currentScene.userData.isActive === undefined) :", {
						currentScene
					})
				)
			}

			currentScene.userData.isActive = true
			$svelthreeStores[sti].scenes[currentScene.userData.index_in_scenes].isActive = true
			$svelthreeStores[sti].activeScene = currentScene
			$svelthreeStores[sti].currentSceneIndex = currentScene.userData.index_in_scenes + 1
		}
	}

	function activate_currentScene_2(currentScene: Scene, sti: number): void {
		// resume animations only if scene was being deactivated before
		if (currentScene.userData.isActive === false) {
			currentScene.userData.isActive = true
			$svelthreeStores[sti].scenes[currentScene.userData.index_in_scenes].isActive = true
			$svelthreeStores[sti].activeScene = currentScene
			$svelthreeStores[sti].currentSceneIndex = currentScene.userData.index_in_scenes + 1
		} else if (currentScene.userData.isActive === undefined) {
			if (verbose && log_dev) {
				console.debug(
					...c_dev(c_name, "activate_currentScene! -> if (currentScene.userData.isActive === undefined) :", {
						currentScene
					})
				)
			}

			currentScene.userData.isActive = true
			$svelthreeStores[sti].scenes[currentScene.userData.index_in_scenes].isActive = true
			$svelthreeStores[sti].activeScene = currentScene
			$svelthreeStores[sti].currentSceneIndex = currentScene.userData.index_in_scenes + 1
		}
	}

	// IMPORTANT  avoid component updates if not neccessary by e.g. by putting values into
	// NOT EXPORTED top-level objects -> EXPORTED top-level objects will be reactive due to 'svelte-accmod'!
	const rAF = { id: undefined }
	const frames = { total: 0 }

	let doAnimate = false

	function start_animating(): void {
		if (verbose && log_dev) console.debug(...c_dev(c_name, "start_animating!"))
		doAnimate = true
		animate()
	}

	function animate(): void {
		//if (verbose && log_dev) console.debug(...c_dev(c_name, "animate!"))
		if (renderer.xr.enabled === false) {
			renderStandard()
		} else {
			throw new Error ("SVELTHREE > You're using the non-XR svelthree version!")
		}
	}

	let logOnce = true

	// TODO  CHECK / IMPROVE!
	async function renderStandard(): Promise<void> {
		// inside only
		if (!inputs && currentCam.userData.renderer_currentcam_needsupdate) {
			currentCam.userData.renderer_currentcam_needsupdate = false
			set_currentCam()
		}

		// inside only
		if (!inputs && currentCam.userData.renderer_currentscene_needsupdate) {
			currentCam.userData.renderer_currentscene_needsupdate = false
			set_currentScene()
		}

		if (doAnimate) {
			if (logOnce) doLogOnce("renderStandard")

			dispatch("before_render", { frame: frames.total })
			dispatch("before_render_int", { frame: frames.total })
			dispatch("before_render_scene", { frame: frames.total })

			// VERY IMPORTANT  THREE  SVELTE :
			// inserting await tick() here enables cross-referencing:
			await tick()

			// update OrbitControls (NonXR)
			// required if `enableDamping` or `autoRotate` are set to `true`
			if (inputs_queue.length) {
				for (let i = 0; i < inputs_queue.length; i++) {
					const queued = inputs_queue[i]
					const sti = queued.sti

					if ($svelthreeStores[sti].orbitcontrols.length) {
						for (let i = 0; i < $svelthreeStores[sti].orbitcontrols.length; i++) {
							let oc: OrbitControls = $svelthreeStores[sti].orbitcontrols[i]
							if (oc.autoRotate || oc.enableDamping) oc.update()
						}
					}
				}
			} else {
				if ($svelthreeStores[sti].orbitcontrols.length) {
					for (let i = 0; i < $svelthreeStores[sti].orbitcontrols.length; i++) {
						let oc: OrbitControls = $svelthreeStores[sti].orbitcontrols[i]
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
							let cubeCamComponent: SvelteComponentDev = $svelthreeStores[sti].cubeCameras[i]
							if (cubeCamComponent.dynamic) {
								cubeCamComponent.update_cubecam()
							} else if (!cubeCamComponent.camera_updated) {
								cubeCamComponent.update_cubecam()
								cubeCamComponent.camera_updated = true
							}
						}
					}
				}
			} else {
				if ($svelthreeStores[sti].cubeCameras.length) {
					for (let i = 0; i < $svelthreeStores[sti].cubeCameras.length; i++) {
						let cubeCamComponent: SvelteComponentDev = $svelthreeStores[sti].cubeCameras[i]
						if (cubeCamComponent.dynamic) {
							cubeCamComponent.update_cubecam()
						} else if (!cubeCamComponent.camera_updated) {
							cubeCamComponent.update_cubecam()
							cubeCamComponent.camera_updated = true
						}
					}
				}
			}

			if (inputs_queue.length) {
				// only outside
				for (let i = 0; i < inputs_queue.length; i++) {
					const inp = inputs_queue[i]
					// inside should be false if inputs_queue.length
					if (!outputs_queue?.length && inside === false) {
						renderer.setSize(inp.dom_element.width, inp.dom_element.height)
					}

					if (outputs_queue?.length) {

						for (let j = 0; j < outputs_queue.length; j++) {
							const out = outputs_queue[j]
							
							inp.cam.setViewOffset(out.viewOffset[0], out.viewOffset[1], out.viewOffset[2], out.viewOffset[3], out.viewOffset[4], out.viewOffset[5])
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
				// only inside
				if (resizeRendererOnNextFrame) {
					renderer.setSize($canvas_dim.w, $canvas_dim.h, true)
					resizeRendererOnNextFrame = false
				}

				renderer.render(currentScene, currentCam)
				const context = canvas_dom_element.getContext("2d")
				context.drawImage(renderer.domElement, 0, 0)
			}

			frames.total++
			dispatch("after_render", { frame: frames.total })

			rAF.id = requestAnimationFrame(animate)
		}
	}

	function doLogOnce(renderMode: string): void {
		logOnce = false
		if (verbose && log_dev)
			console.debug(
				...c_dev(c_name, `animate > doLogOnce! -> animate : ${renderMode}`, {
					currentScene,
					currentCam,
					canvas_dom_element
				})
			)
	}

	function stopAnimating(): void {
		doAnimate = false
		cancelAnimationFrame(rAF.id)
	}

	// public methods

	export function getRenderer(): WebGLRenderer {
		return renderer
	}

	export function getCurrentCamera(): Camera {
		return currentCam
	}

	// TODO  different?

	export function setRender(parameters = { sceneId: "", camId: "" }): void {
		sceneToRenderId = parameters.sceneId
		camToRenderId = parameters.camId
	}

	onMount(() => {
		if (verbose && log_lc && (log_lc.all || log_lc.om)) console.info(...c_lc(c_name, "onMount"))

		return () => {
			if (verbose && log_lc && (log_lc.all || log_lc.od)) console.info(...c_lc(c_name, "onDestroy"))
			stopAnimating()
			renderer.dispose()
			renderer.forceContextLoss()
		}
	})

	beforeUpdate(() => {
		if (verbose && log_lc && (log_lc.all || log_lc.bu)) console.info(...c_lc(c_name, "beforeUpdate"))
	})

	afterUpdate(() => {
		if (verbose && log_lc && (log_lc.all || log_lc.au)) console.info(...c_lc(c_name, "afterUpdate"))
	})
</script>
