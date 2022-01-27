<!--
`accessors:true` hast to be set per component because of the svelte-language-server bug, otherwise accessors would be falsely detected as missing and highlighted as errors.
svelthree uses svelte-accmod, where accessors are always `true`, regardless of `svelte:options`.  
-->
<svelte:options accessors />

<!-- 
@component
This is a **svelthree** _Canvas_ Component.  
[ tbd ]  Link to Docs.
-->
<script context="module" lang="ts">
	export type StoreBody = {
		id: number
		canvas: StoreCanvas
		scenes: SvelthreeStoreArray

		// IMPORTANT !
		/** `currentSceneIndex` will always be `+1` real index, because index `0` means `false`,
		 * so the change from `undefined` to `0` will not be triggered.
		 */
		currentSceneIndex: number

		cameras: SvelthreeStoreArray
		cubeCameras: SvelthreeStoreArray
		activeCamera: PerspectiveCamera | OrthographicCamera
		activeScene: Scene
		renderer: WebGLRenderer
		rendererComponent: SvelteComponentDev
		raycaster: Raycaster
		orbitcontrols: SvelthreeStoreArray
		useBVH: boolean
	}
</script>

<script lang="ts">
	// #region --- Imports

	import { afterUpdate, beforeUpdate, onMount, setContext } from "svelte"
	import { get_current_component, SvelteComponentDev } from "svelte/internal"
	import { self as _self } from "svelte/internal"
	import { BufferGeometry, Mesh, Raycaster, Scene, Vector2, Vector3, WebGLRenderer } from "three"
	import type { OrthographicCamera, PerspectiveCamera } from "three"
	import { acceleratedRaycast, computeBoundsTree, disposeBoundsTree } from "three-mesh-bvh"
	import { svelthreeStores } from "../stores"
	import { SvelthreeStoreArray } from "../utils/SvelthreeStoreArray"
	import type { PointerState, StoreCanvas } from "../types-extra"
	import { c_rs, c_lc, c_dev, verbose_mode, get_comp_name } from "../utils/SvelthreeLogger"
	import type { LogLC, LogDEV } from "../utils/SvelthreeLogger"
	import { RaycastArray } from "../utils/RaycastArray"
	import { writable } from "svelte/store"
	import type { Writable } from "svelte/store"

	const self = get_current_component()
	const c_name = get_comp_name(self)
	const verbose: boolean = verbose_mode()

	export let log_all: boolean = false
	export let log_dev: { [P in keyof LogDEV]: LogDEV[P] } = log_all ? { all: true } : undefined
	export let log_rs: boolean = log_all
	export let log_lc: { [P in keyof LogLC]: LogLC[P] } = log_all ? { all: true } : undefined
	export let log_mau: boolean = log_all

	// #endregion

	export const is_svelthree_component: boolean = true
	export const is_svelthree_canvas: boolean = true

	// #region --- Required Attributes

	export let w: number
	export let h: number

	// #endregion

	// #region --- Optional Attributes

	export let style: string = undefined
	let clazz: string = undefined
	export { clazz as class }

	export let interactive: boolean = undefined
	const canvas_interactivity: Writable<{ enabled: boolean }> = writable({ enabled: interactive })
	setContext("canvas_interactivity", canvas_interactivity)
	$: if (interactive !== undefined) $canvas_interactivity.enabled = interactive

	// #endregion

	// #region --- Store Body and Types

	const svelthreeStoreBody: StoreBody = {
		id: undefined,
		canvas: {
			dom: undefined,
			svelthreeComponent: undefined,
			dim: { w: undefined, h: undefined },
			interactive: false
		},
		// scene objects
		scenes: new SvelthreeStoreArray("index_in_scenes", ["scene", "userData"]),

		// IMPORTANT !
		/** `currentSceneIndex` will always be `+1` real index, because index `0` means `false`,
		 * so the change from `undefined` to `0` will not be triggered.
		 */
		currentSceneIndex: undefined,

		// camera objects
		cameras: new SvelthreeStoreArray("index_in_cameras", ["camera", "userData"]),
		// cubeCamera COMPONENT references
		cubeCameras: new SvelthreeStoreArray("index_in_cubecameras", ["camera", "userData"]),
		activeCamera: undefined,
		activeScene: undefined,
		renderer: undefined,
		rendererComponent: undefined,
		raycaster: undefined,

		orbitcontrols: new SvelthreeStoreArray("index_in_orbitcontrols", ["userData"]),
		useBVH: false
	}

	// #endregion

	// #region --- Initialization

	// create new store
	$svelthreeStores = [...$svelthreeStores, svelthreeStoreBody]

	// set and share store index
	let sti: number
	sti = $svelthreeStores.length - 1
	setContext("store_index", sti)
	export const get_sti = (): number => sti

	// canvas
	let c: HTMLCanvasElement

	// IMPORTANT  reactive!
	const canvas_dom: Writable<{ element: HTMLCanvasElement }> = writable({ element: c })
	setContext("canvas_dom", canvas_dom)
	$: $canvas_dom.element = c

	// IMPORTANT  reactive!
	const canvas_dim: Writable<{ w: number; h: number }> = writable({ w, h })
	setContext("canvas_dim", canvas_dim)
	$: if (w && h) {
		$canvas_dim.w = w
		$canvas_dim.h = h
	}

	// pointer
	// IMPORTANT  not reactive!
	const pointer_state: PointerState = {
		pos: new Vector2(-1, -1),
		event: undefined,
		isOverCanvas: false,
		unprojected: new Vector3()
	}

	setContext("pointer", pointer_state)

	// IMPORTANT  not reactive!
	// needed by 'SvelthreeInteraction' sub-components.
	let all_intersections: { result: any[] } = {
		result: []
	}
	setContext("all_intersections", all_intersections)


	// --- BVH

	let originalThreeRaycastFunction: (raycaster: Raycaster, intersects: THREE.Intersection[]) => void
	export let useBVH: boolean = undefined

	$: if (useBVH) {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "Using BVH", { useBVH }))

		$svelthreeStores[sti].useBVH = useBVH

		if (!Object.keys(BufferGeometry.prototype).includes("computeBoundsTree")) {
			// backup original raycast function
			originalThreeRaycastFunction = Mesh.prototype.raycast

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

	// --- interactivity

	let raycaster: Raycaster

	$: if (c && !interactive) {
		c.addEventListener("pointerenter", onPointerEnter_notInteractive, false)
		c.addEventListener("pointerleave", onPointerLeave_notInteractive, false)
	}

	// reactive create raycaster
	$: interactive && !raycaster && c && $svelthreeStores[sti].renderer ? createRaycaster() : null

	function createRaycaster() {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "createRaycaster > interactive", interactive))

		raycaster = new Raycaster()

		$svelthreeStores[sti].raycaster = raycaster
		$canvas_interactivity.enabled = true

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
	$: !interactive && raycaster && $svelthreeStores[sti].renderer ? removeRaycaster() : null

	function removeRaycaster() {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "removeRaycaster > interactive", interactive))

		$canvas_interactivity.enabled = false

		$svelthreeStores[sti].raycaster = undefined
		raycaster = null

		// start updating mouse position (if not xr)
		if ($svelthreeStores[sti].renderer.xr.enabled === false) {
			removeAllPointerListeners()
		}

		if (verbose && log_rs) {
			console.debug(...c_rs(c_name, "after Raycaster remove, $svelthreeStores[sti]:", $svelthreeStores[sti]))
		}
	}

	// start updating mouse position (if not xr)
	function startUpdatingPointer(): void {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "createRaycaster > startUpdatingPointer!"))

		c.addEventListener("pointermove", updatePointer, false)
		c.addEventListener("pointerenter", onPointerEnter, false)
		c.addEventListener("pointerleave", onPointerLeave, false)

		c.removeEventListener("pointerenter", onPointerEnter_notInteractive)
		c.removeEventListener("pointerleave", onPointerLeave_notInteractive)
	}

	function onPointerEnter(): void {
		pointer_state.isOverCanvas = true

		c.addEventListener("pointerleave", onPointerLeave, false)
		c.addEventListener("pointermove", updatePointer, false)
		c.removeEventListener("pointerenter", updatePointer)

		//console.log("onPointerEnter!")
	}

	function onPointerEnter_notInteractive(): void {
		pointer_state.isOverCanvas = true
		c.addEventListener("pointerleave", onPointerLeave_notInteractive, false)
		c.removeEventListener("pointerenter", onPointerEnter_notInteractive)

		console.log("onPointerEnter_notInteractive!")

		$svelthreeStores[sti].orbitcontrols.length > 0 ? set_cursor_style("all-scroll") : set_cursor_style("default")
	}

	function onPointerLeave_notInteractive(): void {
		pointer_state.isOverCanvas = false

		c.addEventListener("pointerenter", onPointerEnter_notInteractive, false)
		c.removeEventListener("pointerleave", onPointerLeave_notInteractive)

		set_cursor_style("default")

		//console.log("onPointerLeave_notInteractive!")
	}

	function onPointerLeave(): void {
		pointer_state.isOverCanvas = false

		c.removeEventListener("pointermove", updatePointer)
		c.removeEventListener("pointerleave", onPointerLeave)
		c.addEventListener("pointerenter", onPointerEnter, false)

		set_cursor_style("default")

		//console.log("onPointerLeave!")
	}

	function removeAllPointerListeners(): void {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "removeAllPointerListeners!"))
		c.removeEventListener("pointermove", updatePointer)
		c.removeEventListener("pointerenter", onPointerEnter)
		c.removeEventListener("pointerleave", onPointerLeave)
		c.removeEventListener("pointerenter", onPointerEnter_notInteractive)
		c.removeEventListener("pointerleave", onPointerLeave_notInteractive)
	}

	function updatePointer(e: PointerEvent): void {
		// type 'ClientRect' is deprecated, see : https://issueexplorer.com/issue/tinymce/tinymce/7140, using 'DOMRect' instead.
		let rect: DOMRect = c.getBoundingClientRect()

		pointer_state.pos.x = ((e.clientX - rect.left) / (rect.right - rect.left)) * 2 - 1
		pointer_state.pos.y = -((e.clientY - rect.top) / (rect.bottom - rect.top)) * 2 + 1

		let v: Vector3 = new Vector3(pointer_state.pos.x, pointer_state.pos.y, 0.5)
		let t: Vector3 = new Vector3()

		v.unproject($svelthreeStores[sti].activeCamera)
		v.sub($svelthreeStores[sti].activeCamera.position).normalize()
		let d = -$svelthreeStores[sti].activeCamera.position.z / v.z
		t.copy($svelthreeStores[sti].activeCamera.position).add(v.multiplyScalar(d))

		pointer_state.unprojected.copy(t)

		/*
         IMPORTANT  we save this event in SvelthreeInteraction.svelte for construction of:
         'pointerenter', 'pointerover', 'pointerout', 'pointerleave' & 'pointermove'
        */
		pointer_state.event = e

		update_all_intersections_and_cursor()
	}

	/** An array which accepts **svelthree components** or any Object3D to be checked for **intersection** with the ray -> see [`Raycaster`](https://threejs.org/docs/#api/en/core/Raycaster). */
	export let raycast: RaycastArray = new RaycastArray()

	function update_all_intersections_and_cursor(): void {
		if (interactive && pointer_state.isOverCanvas) {
			raycaster.setFromCamera(pointer_state.pos, $svelthreeStores[sti].activeCamera)
			all_intersections.result = raycaster.intersectObjects(raycast, true)

			if (all_intersections.result.length && all_intersections.result[0].object.userData.interact) {
				set_cursor_style("pointer")
			} else {
				$svelthreeStores[sti].orbitcontrols.length > 0
					? set_cursor_style("all-scroll")
					: set_cursor_style("default")
			}
		}
	}

	function set_cursor_style(css_value: string): void {
		// doesn't update the component on cursor change (as opposed to c.style)
		self.$$.root.style.cursor = css_value
	}

	// --- public methods

	export const getDomElement = (): HTMLCanvasElement => c
	export const getDomElementDimensions = (): { w: number; h: number } => {
		return { w, h }
	}

	// --- lifecycle

	onMount(async () => {
		if (verbose && log_lc && (log_lc.all || log_lc.om)) console.info(...c_lc(c_name, "onMount"))
		if (verbose && log_dev)
			console.debug(...c_dev(c_name, "onMount -> $svelthreeStores[sti]", $svelthreeStores[sti]))

		return () => {
			if (verbose && log_lc && (log_lc.all || log_lc.od)) console.info(...c_lc(c_name, "onDestroy"))
			removeAllPointerListeners()
			// if canvas is being removed set the the whole store to 'null'
			// this way we don't have to handle anything, other store 'sti' will remain valid
			// any newly added canvas will create a new store at the next highest index
			// the value of 'sti' is completely irrelevant to the user, doesn't need to be handled.
			$svelthreeStores[sti] = null
		}
	})

	beforeUpdate(() => {
		if (verbose && log_lc && (log_lc.all || log_lc.bu)) console.info(...c_lc(c_name, "beforeUpdate"))
	})

	afterUpdate(() => {
		if (verbose && log_lc && (log_lc.all || log_lc.au)) console.info(...c_lc(c_name, "afterUpdate"))
	})
</script>

<canvas bind:this={c} width={w} height={h} {style} class={clazz}>
	<!-- <slot {sti} /> -->
	<slot />
</canvas>
