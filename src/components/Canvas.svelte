<!--
`accessors:true` hast to be set per component because of the svelte-language-server bug, otherwise accessors would be falsely detected as missing and highlighted as errors.
svelthree uses svelte-accmod, where accessors are always `true`, regardless of `svelte:options`.  
-->
<svelte:options accessors />

<!-- 
@component
This is a **svelthree** _Canvas_ Component.  
 TODO  Link to Docs.
-->
<script lang="ts">
	// #region --- Imports

	import { afterUpdate, beforeUpdate, onMount } from "svelte"
	import { get_current_component, SvelteComponentDev } from "svelte/internal"
	import { BufferGeometry, Camera, Mesh, Raycaster, Scene, Vector2, Vector3, WebGLRenderer } from "three"
	import type { WebXRController, XRFrame } from "three"
	import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
	import { acceleratedRaycast, computeBoundsTree, disposeBoundsTree } from "three-mesh-bvh"
	import { svelthreeStores } from "../stores"
	import type {
		XrHandPinchConfig,
		XrHandPinchConfigItem,
		XrHandTouchConfig,
		XrHandTouchEvents,
		XrHandTouchXConfig,
		XrHitTestMode,
		XrInputConfigGrippable,
		XrSessionVRInputConfig
	} from "../xr/types-svelthree"
	import type { XRHitTestSource } from "../xr/types-webxr"
	import { c_rs, c_lc, c_mau, c_dev, verbose_mode, get_comp_name } from "../utils/SvelthreeLogger"
	import type { LogLC, LogDEV } from "../utils/SvelthreeLogger"

	const c_name = get_comp_name(get_current_component())
	const verbose: boolean = verbose_mode()

	export let log_all: boolean = false
	export let log_dev: { [P in keyof LogDEV]: LogDEV[P] } = log_all ? { all: true } : undefined
	export let log_rs: boolean = log_all
	export let log_lc: { [P in keyof LogLC]: LogLC[P] } = log_all ? { all: true } : undefined
	export let log_mau: boolean = log_all

	// #endregion

	// #region --- Required Attributes

	export let w: number
	export let h: number

	// #endregion

	// #region --- Optional Attributes

	export let style: string = undefined
	let clazz: string = undefined
	export { clazz as class }
	export let interactive: boolean = undefined

	// #endregion

	// #region --- Store Body and Types

	interface StoreCanvas {
		dom: HTMLCanvasElement
		dim: { w: number; h: number }
		interactive: boolean
	}

	interface StorePointer {
		pos: Vector2
		event: PointerEvent
		isOverCanvas: boolean
		unprojected: Vector3
	}

	interface SvelthreeXRFrame {
		timestamp: number
		delta: number
		frame: XRFrame
	}

	interface XR {
		sessionMode: string
		inputConfig: XrSessionVRInputConfig
		controller: WebXRController // AR
		controllerConfig: XrInputConfigGrippable
		controllers: WebXRController[] //VR
		enablePinch: XrHandPinchConfig
		enableTouch: XrHandTouchConfig
		touchEvents: XrHandTouchEvents
		enableTouchX: XrHandTouchXConfig
		leftHandTouchEnabled: boolean
		leftHandTouchEnabledJoints: number[]
		rightHandTouchEnabled: boolean
		rightHandTouchEnabledJoints: number[]
		leftHandPinchEnabled: boolean
		leftHandPinchConfig: XrHandPinchConfigItem
		rightHandPinchEnabled: boolean
		rightHandPinchConfig: XrHandPinchConfigItem
		requiredFeatures: string[]
		optionalFeatures: string[]
		domOverlay: HTMLDivElement
		hitTestModeInitial: XrHitTestMode
		hitTestMode: XrHitTestMode
		hitTestSource: XRHitTestSource
		hitTestSourceRequested: boolean
		hitTestResults: any[]
		reticle: Mesh
		currentFrame: SvelthreeXRFrame
	}

	interface StoreBody {
		id: number
		canvas: StoreCanvas
		scenes: Scene[]

		// IMPORTANT !
		// 'currentSceneIndex' will always be +1 real index, because index '0' means 'false',
		// so change from 'undefined' to '0' will not be triggered.
		currentSceneIndex: number

		cameras: Camera[]
		cubeCameras: SvelteComponentDev[]
		activeCamera: Camera
		renderer: WebGLRenderer
		rendererComponent: SvelteComponentDev
		raycaster: Raycaster
		allIntersections: any[]
		pointer: StorePointer
		orbitcontrols: OrbitControls
		xr: XR
		useBVH: boolean
	}

	const svelthreeStoreBody: StoreBody = {
		id: undefined,
		canvas: {
			dom: undefined,
			dim: { w: undefined, h: undefined },
			interactive: false
		},
		scenes: [],

		// IMPORTANT !
		// 'currentSceneIndex' will always be +1 real index, because index '0' means 'false',
		// so change from 'undefined' to '0' will not be triggered.
		currentSceneIndex: undefined,

		cameras: [],
		cubeCameras: [],
		activeCamera: undefined,
		renderer: undefined,
		rendererComponent: undefined,
		raycaster: undefined,
		allIntersections: undefined,
		pointer: {
			pos: new Vector2(-1, -1),
			event: undefined,
			isOverCanvas: false,
			unprojected: new Vector3()
		},
		orbitcontrols: undefined,
		xr: {
			sessionMode: undefined,
			inputConfig: undefined,
			controller: undefined,
			controllerConfig: undefined,
			controllers: [],
			enablePinch: undefined,
			enableTouch: undefined,
			touchEvents: undefined,
			enableTouchX: undefined,
			leftHandTouchEnabled: undefined,
			leftHandTouchEnabledJoints: undefined,
			rightHandTouchEnabled: undefined,
			rightHandTouchEnabledJoints: undefined,
			leftHandPinchEnabled: false,
			leftHandPinchConfig: undefined,
			rightHandPinchEnabled: false,
			rightHandPinchConfig: undefined,
			requiredFeatures: [],
			optionalFeatures: [],
			domOverlay: undefined,
			hitTestModeInitial: undefined,
			hitTestMode: undefined,
			hitTestSource: null,
			hitTestSourceRequested: false,
			hitTestResults: undefined,
			reticle: undefined,
			currentFrame: {
				timestamp: 0,
				delta: 0,
				frame: undefined
			}
		},
		useBVH: false
	}

	// #endregion

	// #region --- Initialization

	// store required width & height properties
	svelthreeStoreBody.canvas.dim.w = w
	svelthreeStoreBody.canvas.dim.h = h

	// create new store
	$svelthreeStores = [...$svelthreeStores, svelthreeStoreBody]

	// declare store index
	let sti: number

	// set store index
	sti = $svelthreeStores.length - 1

	// #endregion

	// #region --- Reactiveness

	// store DOM Canvas Element when available

	let c: HTMLElement
	$: c ? storeCanvasDom() : null

	function storeCanvasDom(): void {
		$svelthreeStores[sti].canvas.dom === undefined ? ($svelthreeStores[sti].canvas.dom = c) : null
	}

	// store required width & height properties on change

	$: w ? (svelthreeStoreBody.canvas.dim.w = w) : null
	$: h ? (svelthreeStoreBody.canvas.dim.h = h) : null

	// --- BVH

	let originalThreeRaycastFunction: (raycaster: Raycaster, intersects: THREE.Intersection[]) => void
	export let useBVH: boolean = undefined

	$: if (useBVH) {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "Using BVH", { useBVH }))

		$svelthreeStores[sti].useBVH = useBVH

		//if (!BufferGeometry.prototype.hasOwnProperty("computeBoundsTree")) {
		if (!Object.keys(BufferGeometry.prototype).includes("computeBoundsTree")) {
			// backup original raycast function
			originalThreeRaycastFunction = Mesh.prototype.raycast

			// TODO  this doesn't work, understand why and why you did it in the first place.
			//Object.defineProperty(BufferGeometry.prototype, "computeBoundsTree", computeBoundsTree)
			//Object.defineProperty(BufferGeometry.prototype, "disposeBoundsTree", disposeBoundsTree)

			BufferGeometry.prototype["computeBoundsTree"] = computeBoundsTree
			BufferGeometry.prototype["disposeBoundsTree"] = disposeBoundsTree

			Mesh.prototype.raycast = acceleratedRaycast

			//if (verbose && log_rs) console.debug(...c_rs(c_name, "if useBVH -> if Object.keys(BufferGeometry.prototype) ->", Object.keys(BufferGeometry.prototype)))
		}
	} else {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "Not using BVH", { useBVH }))
		$svelthreeStores[sti].useBVH = useBVH

		if (BufferGeometry.prototype.hasOwnProperty("computeBoundsTree")) {
			BufferGeometry.prototype["computeBoundsTree"] = undefined
			BufferGeometry.prototype["disposeBoundsTree"] = undefined

			// restore original raycast function
			Mesh.prototype.raycast = originalThreeRaycastFunction
		}
	}

	// --- Interactivity

	let didMount: boolean
	let isInteractive = false
	let raycaster: Raycaster

	// initialize interaction on mount
	$: didMount ? (isInteractive = interactive) : null

	// reactive create raycaster
	$: isInteractive && !raycaster && c && $svelthreeStores[sti].renderer ? createRaycaster() : null

	function createRaycaster() {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "createRaycaster > isInteractive", isInteractive))

		raycaster = new Raycaster()
		$svelthreeStores[sti].raycaster = raycaster
		$svelthreeStores[sti].canvas.interactive = true

		if ($svelthreeStores[sti].renderer.xr.enabled === false) {
			startUpdatingPointer()
		}

		if (verbose && log_dev) {
			console.info(
				"SVELTHREE > Canvas : after Raycaster creation, $svelthreeStores[sti]: ",
				$svelthreeStores[sti]
			)
		}
	}

	// reactive remove raycaster
	$: !isInteractive && raycaster && $svelthreeStores[sti].renderer ? removeRaycaster() : null

	function removeRaycaster() {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "removeRaycaster > isInteractive", isInteractive))

		$svelthreeStores[sti].canvas.interactive = false
		$svelthreeStores[sti].raycaster = undefined
		raycaster = null

		// start updating mouse position (if not xr)
		if ($svelthreeStores[sti].renderer.xr.enabled === false) {
			stopUpdatingPointer()
		}

		if (verbose && log_rs) {
			console.debug(...c_rs(c_name, "after Raycaster remove, $svelthreeStores[sti]:", $svelthreeStores[sti]))
		}
	}

	// start updating mouse position (if not xr)
	function startUpdatingPointer(): void {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "createRaycaster > startUpdatingPointer!"))
		window.addEventListener("pointermove", updatePointer, false)
	}

	function stopUpdatingPointer(): void {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "removeRaycaster > stopUpdatingPointer!"))
		window.removeEventListener("pointermove", updatePointer)
	}

	function updatePointer(e: PointerEvent): void {
		let rect: ClientRect = c.getBoundingClientRect()

		$svelthreeStores[sti].pointer.pos.x = ((e.clientX - rect.left) / (rect.right - rect.left)) * 2 - 1
		$svelthreeStores[sti].pointer.pos.y = -((e.clientY - rect.top) / (rect.bottom - rect.top)) * 2 + 1

		e.clientX > rect.left && e.clientX < rect.right && e.clientY > rect.top && e.clientY < rect.bottom
			? ($svelthreeStores[sti].pointer.isOverCanvas = true)
			: ($svelthreeStores[sti].pointer.isOverCanvas = false)

		// calculate unprojected Point
		// see https://stackoverflow.com/questions/13055214/mouse-canvas-x-y-to-three-js-world-x-y-z
		let v: Vector3 = new Vector3($svelthreeStores[sti].pointer.pos.x, $svelthreeStores[sti].pointer.pos.y, 0.5)
		let t: Vector3 = new Vector3()
		v.unproject($svelthreeStores[sti].activeCamera)
		v.sub($svelthreeStores[sti].activeCamera.position).normalize()
		let d = -$svelthreeStores[sti].activeCamera.position.z / v.z
		t.copy($svelthreeStores[sti].activeCamera.position).add(v.multiplyScalar(d))
		$svelthreeStores[sti].pointer.unprojected.copy(t)

		/*
         IMPORTANT  we save this event in SvelthreeInteraction.svelte for construction of:
         'pointerenter', 'pointerover', 'pointerout', 'pointerleave' & 'pointermove'
        */
		$svelthreeStores[sti].pointer.event = e
	}

	onMount(() => {
		didMount = true
		if (verbose && log_lc && (log_lc.all || log_lc.om)) console.info(...c_lc(c_name, "onMount"))
		if (verbose && log_dev)
			console.debug(...c_dev(c_name, "onMount -> $svelthreeStores[sti]", $svelthreeStores[sti]))

		return () => {
			if (verbose && log_lc && (log_lc.all || log_lc.od)) console.info(...c_lc(c_name, "onDestroy"))
			stopUpdatingPointer()
			// if canvas is being removed set the the whole store to 'null'
			// this way we don't have to handle anything, other store 'sti' will remain valid
			// any newly added canvas will create a new store at the next highest index
			// the value of 'sti' is completely irrelevant to the user, doesn't need to be handled.
			$svelthreeStores[sti] = null
		}
	})

	// #endregion

	// #region --- Public Methods

	export function getDomElement(): HTMLCanvasElement {
		return $svelthreeStores[sti].canvas.dom
	}

	export function getDomElementDimensions(): { w: number; h: number } {
		return {
			w: $svelthreeStores[sti].canvas.dom.width,
			h: $svelthreeStores[sti].canvas.dom.height
		}
	}

	export function resize(w: number, h: number) {
		$svelthreeStores[sti].canvas.dim = { w: w, h: h }
	}

	beforeUpdate(() => {
		if (verbose && log_lc && (log_lc.all || log_lc.bu)) console.info(...c_lc(c_name, "beforeUpdate"))
	})

	afterUpdate(() => {
		if (verbose && log_lc && (log_lc.all || log_lc.au)) console.info(...c_lc(c_name, "afterUpdate"))
	})
</script>

<canvas bind:this={c} width={w} height={h} {style} class={clazz}>
	<slot {sti} />
</canvas>
