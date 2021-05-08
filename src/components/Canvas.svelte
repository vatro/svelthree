<!-- 
@component
This is a **svelthree** _Canvas_ Component.  
 TODO  Link to Docs.
-->
<script lang="ts">
	// #region --- Imports

	import { afterUpdate, beforeUpdate, onMount } from "svelte"
	import type { SvelteComponentDev } from "svelte/internal"
	import {
		BufferGeometry,
		Camera,
		Mesh,
		Raycaster,
		Scene,
		Vector2,
		Vector3,
		WebGLRenderer,
		WebXRController
	} from "three"
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
	import type { XRFrame, XRHitTestSource } from "../xr/types-webxr"

	const css_rs = "color: red;font-weight:bold;"
	const css_ba = "color: blue;font-weight:bold;"
	const css_aa = "color: green;font-weight:bold;"
	export let logInfo: boolean = false
	export let logRS: boolean = false
	export let logLC: boolean = false

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
		if (logRS) console.log("%c---> Canvas > reactive statement! useBVH", `${css_rs}`, useBVH)

		$svelthreeStores[sti].useBVH = useBVH

		//if (!BufferGeometry.prototype.hasOwnProperty("computeBoundsTree")) {
		if (Object.keys(BufferGeometry.prototype).indexOf("computeBoundsTree") < 0) {
			// backup original raycast function
			originalThreeRaycastFunction = Mesh.prototype.raycast

			// TODO  this doesn't work, understand why and why you did it in the first place.
			//Object.defineProperty(BufferGeometry.prototype, "computeBoundsTree", computeBoundsTree)
			//Object.defineProperty(BufferGeometry.prototype, "disposeBoundsTree", disposeBoundsTree)

			BufferGeometry.prototype["computeBoundsTree"] = computeBoundsTree
			BufferGeometry.prototype["disposeBoundsTree"] = disposeBoundsTree

			Mesh.prototype.raycast = acceleratedRaycast

			//console.log(Object.keys(BufferGeometry.prototype))
		}
	} else {
		if (logRS) console.log("%c---> Canvas > reactive statement! useBVH", `${css_rs}`, useBVH)
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
		if (logRS) console.log("%c---> Canvas > reactive statement! createRaycaster!", `${css_rs}`, { isInteractive })
		raycaster = new Raycaster()
		$svelthreeStores[sti].raycaster = raycaster
		$svelthreeStores[sti].canvas.interactive = true

		if ($svelthreeStores[sti].renderer.xr.enabled === false) {
			startUpdatingPointer()
		}

		if (logInfo)
			console.info(
				"SVELTHREE > Canvas : after Raycaster creation, $svelthreeStores[sti]: ",
				$svelthreeStores[sti]
			)
	}

	// reactive remove raycaster
	$: !isInteractive && raycaster && $svelthreeStores[sti].renderer ? removeRaycaster() : null

	function removeRaycaster() {
		if (logRS) console.log("%c---> Canvas > reactive statement! removeRaycaster!", `${css_rs}`, { isInteractive })
		$svelthreeStores[sti].canvas.interactive = false
		$svelthreeStores[sti].raycaster = undefined
		raycaster = null

		// start updating mouse position (if not xr)
		if ($svelthreeStores[sti].renderer.xr.enabled === false) {
			stopUpdatingPointer()
		}

		if (logInfo)
			console.info("SVELTHREE > Canvas : after Raycaster remove, $svelthreeStores[sti]: ", $svelthreeStores[sti])
	}

	// start updating mouse position (if not xr)
	function startUpdatingPointer(): void {
		if (logRS)
			console.log("%c---> Canvas > reactive statement! createRaycaster > startUpdatingPointer!", `${css_rs}`)
		window.addEventListener("pointermove", updatePointer, false)
	}

	function stopUpdatingPointer(): void {
		if (logRS)
			console.log("%c---> Canvas > reactive statement! removeRaycaster > stopUpdatingPointer!", `${css_rs}`)
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
		if (logLC) logCurrentState(`--> Canvas > onMount`, null)
		if (logInfo) console.info("SVELTHREE > onMount : Canvas, $svelthreeStores[sti]: ", $svelthreeStores[sti])

		return () => {
			if (logInfo) console.info("SVELTHREE > onDestroy : Canvas")
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

	let updateTime
	let timeBefore
	let timeAfter
	let dirty = false

	beforeUpdate(() => {
		if (!dirty) {
			timeBefore = performance.now()
			dirty = true
		}
		if (logLC) logCurrentState("%c--> Canvas > beforeUpdate", css_ba)
	})

	afterUpdate(() => {
		if (dirty) {
			timeAfter = performance.now()
			dirty = false
			updateTime = timeAfter - timeBefore
		}
		if (logLC) logCurrentState("%c--> Canvas > afterUpdate", css_aa, updateTime)
	})

	function logCurrentState(prefix: string, css: string, upt?: number) {
		console.log(`${prefix}!`, `${css}`, upt ? "update time: " + upt : "")
	}
</script>

<canvas bind:this={c} width={w} height={h} {style} class={clazz}>
	<slot {sti} />
</canvas>
