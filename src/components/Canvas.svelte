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
<script lang="ts">
	// #region --- Imports

	import { afterUpdate, beforeUpdate, onMount, setContext } from "svelte"
	import { get_current_component } from "svelte/internal"
	import { self as _self } from "svelte/internal"
	import { Raycaster, Vector2, Vector3 } from "three"
	import type { Object3D, Scene } from "three"
	import { svelthreeStores } from "../stores"
	import { SvelthreeStoreArray } from "../utils/SvelthreeStoreArray"
	import type { PointerState, StoreBody, WebGLRendererMode } from "../types-extra"
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

	/** If `true` (_default_) the cursor will change automatically (_e.g. over/out canvas DOM element, **interactive** objects or when using the `OrbitControls` component_). */
	export let change_cursor: boolean = true

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

	// IMPORTANT  reactive!
	const pointer_over_canvas: Writable<{ status: boolean }> = writable({ status: false })
	setContext("pointer_over_canvas", pointer_over_canvas)

	// pointer
	// IMPORTANT  not reactive!
	const pointer_state: PointerState = {
		pos: new Vector2(-1, -1),
		event: undefined,
		unprojected: new Vector3()
	}

	setContext("pointer", pointer_state)

	// IMPORTANT  not reactive!
	// needed by 'SvelthreeInteraction' sub-components.
	let all_intersections: { result: any[] } = {
		result: []
	}
	setContext("all_intersections", all_intersections)

	// clear intersections if pointer is out of canvas
	$: if ($pointer_over_canvas.status === false) {
		all_intersections.result = []
	}

	// --- interactivity

	let raycaster: Raycaster

	$: if (c && !interactive) {
		c.addEventListener("pointerenter", onPointerEnter_notInteractive, false)
		c.addEventListener("pointerleave", onPointerLeave_notInteractive, false)
	}

	// reactive create raycaster
	$: interactive && !raycaster && c && $svelthreeStores[sti].renderer ? createRaycaster() : null

	let render_mode: WebGLRendererMode
	$: render_mode = $svelthreeStores[sti].rendererComponent?.mode

	function createRaycaster() {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "createRaycaster > interactive", interactive))

		raycaster = new Raycaster()

		$svelthreeStores[sti].raycaster = raycaster
		$canvas_interactivity.enabled = true

		if ($svelthreeStores[sti].renderer.xr.enabled === false) {
			startUpdatingPointer()
			add_interaction_0_listener()
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
			remove_interaction_0_listener()
		}

		if (verbose && log_rs) {
			console.debug(...c_rs(c_name, "after Raycaster remove, $svelthreeStores[sti]:", $svelthreeStores[sti]))
		}
	}

	let remove_interaction_1_listener: () => void

	function add_interaction_1_listener(): void {
		remove_interaction_1_listener = $svelthreeStores[sti].rendererComponent.$on(
			"interaction_1",
			update_all_intersections_and_cursor
		)
	}

	function add_pointermove_listeners(): void {
		if (render_mode === "always") {
			c.addEventListener("pointermove", updatePointer, false)
			add_interaction_1_listener()
		} else {
			c.addEventListener("pointermove", updatePointer, false)
		}
	}

	function remove_pointermove_listeners(): void {
		if (render_mode === "always") {
			c.removeEventListener("pointermove", updatePointer)
			remove_interaction_1_listener()
			remove_interaction_1_listener = null
		} else {
			c.removeEventListener("pointermove", updatePointer)
		}
	}

	// start updating mouse position (if not xr)
	function startUpdatingPointer(): void {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "createRaycaster > startUpdatingPointer!"))

		add_pointermove_listeners()
		c.addEventListener("pointerenter", onPointerEnter, false)
		c.addEventListener("pointerleave", onPointerLeave, false)

		c.removeEventListener("pointerenter", onPointerEnter_notInteractive)
		c.removeEventListener("pointerleave", onPointerLeave_notInteractive)
	}

	function onPointerEnter(): void {
		$pointer_over_canvas.status = true

		c.addEventListener("pointerleave", onPointerLeave, false)
		add_pointermove_listeners()
		c.removeEventListener("pointerenter", onPointerEnter)

		//console.log("onPointerEnter!")
	}

	function onPointerEnter_notInteractive(): void {
		$pointer_over_canvas.status = true
		c.addEventListener("pointerleave", onPointerLeave_notInteractive, false)
		c.removeEventListener("pointerenter", onPointerEnter_notInteractive)

		//console.log("onPointerEnter_notInteractive!")

		if (change_cursor) {
			$svelthreeStores[sti].orbitcontrols.length > 0
				? set_cursor_style("all-scroll")
				: set_cursor_style("default")
		}
	}

	function onPointerLeave_notInteractive(): void {
		$pointer_over_canvas.status = false

		c.addEventListener("pointerenter", onPointerEnter_notInteractive, false)
		c.removeEventListener("pointerleave", onPointerLeave_notInteractive)

		if (change_cursor) set_cursor_style("default")

		//console.log("onPointerLeave_notInteractive!")
	}

	function onPointerLeave(): void {
		$pointer_over_canvas.status = false

		remove_pointermove_listeners()
		c.removeEventListener("pointerleave", onPointerLeave)
		c.addEventListener("pointerenter", onPointerEnter, false)

		if (change_cursor) set_cursor_style("default")

		//console.log("onPointerLeave!")
	}

	function removeAllPointerListeners(): void {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "removeAllPointerListeners!"))
		remove_pointermove_listeners()
		c.removeEventListener("pointerenter", onPointerEnter)
		c.removeEventListener("pointerleave", onPointerLeave)
		c.removeEventListener("pointerenter", onPointerEnter_notInteractive)
		c.removeEventListener("pointerleave", onPointerLeave_notInteractive)
	}

	/** Triggered on `pointermove` only, saves pointer position etc. */
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

		if (render_mode !== "always") {
			update_all_intersections_and_cursor()
		}
	}

	/** An array which accepts **svelthree components** or any Object3D to be checked for **intersection** with the ray -> see [`Raycaster`](https://threejs.org/docs/#api/en/core/Raycaster). */
	export let raycast: RaycastArray = new RaycastArray()
	// IMPORTANT  not reactive!
	setContext("raycast", raycast)

	let filtered_raycast: {
		dirty: boolean
		objects: Object3D[]
	} = {
		dirty: false,
		objects: []
	}

	$: if ($svelthreeStores[sti].activeScene) filtered_raycast.dirty = true

	let remove_interaction_0_listener: () => void

	function add_interaction_0_listener(): void {
		remove_interaction_0_listener = $svelthreeStores[sti].rendererComponent.$on(
			"interaction_0",
			check_filter_raycast
		)
	}

	function check_filter_raycast(): void {
		//console.log("---> check_filter_raycast!")
		if (raycast.dirty || filtered_raycast.dirty) {
			raycast.dirty = false
			filterRaycast()
		}
	}

	function filterRaycast(): void {
		//console.log("---> filterRaycast!")
		filtered_raycast.objects = []

		for (let i = 0; i < raycast.length; i++) {
			const obj: Object3D = raycast[i]
			if (obj.userData.root_scene) {
				if (obj.userData.root_scene === $svelthreeStores[sti].activeScene) {
					filtered_raycast.objects.push(obj)
				} else {
					/* nothing, object will not be raycasted */
				}
			} else {
				console.error(`SVELTHREE > Canvas > filterRaycast > no 'obj.userData.root_scene'!`, { obj })
			}
		}

		filtered_raycast.dirty = false
	}

	/** If `true` (_default_), the interaction (_pointer intersections_) [`Raycaster`](https://threejs.org/docs/index.html?q=raycaster#api/en/core/Raycaster)
	 * will also check all descendants of interactive objects.
	 * If set to `false` it will only check intersection with interactive objects. */
	export let recursive: boolean = true

	function update_all_intersections_and_cursor(): void {
		if (interactive && $pointer_over_canvas.status === true) {
			raycaster.setFromCamera(pointer_state.pos, $svelthreeStores[sti].activeCamera)
			all_intersections.result = raycaster.intersectObjects(filtered_raycast.objects, recursive)

			if (change_cursor) {
				if (
					all_intersections.result.length &&
					all_intersections.result[0].object.userData.interact &&
					!all_intersections.result[0].object.userData.block
				) {
					set_cursor_style("pointer")
				} else {
					$svelthreeStores[sti].orbitcontrols.length > 0
						? set_cursor_style("all-scroll")
						: set_cursor_style("default")
				}
			}
		}
	}

	/** Get all interactive **three.js object instances** from the currently active (_rendered_) Scene. */
	export function get_interactive(): Object3D[] {
		return filtered_raycast.objects
	}

	/** Get all interactive **svelthree components** from the currently active (_rendered_) Scene. */
	export function get_interactive_components(): any[] {
		return filtered_raycast.objects.map((item: Object3D) => {
			return item.userData.svelthreeComponent
		})
	}

	/** Get all interactive **three.js object instances** from all Scenes inside the Canvas. */
	export function get_interactive_all(): Object3D[] {
		return [...raycast]
	}

	/** Get all interactive **svelthree components** from all Scenes inside the Canvas. */
	export function get_interactive_components_all(): Object3D[] {
		return raycast.map((item: Object3D) => {
			return item.userData.svelthreeComponent
		})
	}

	/** Get all interactive **three.js object instances** intersected by the ray (pointer). */
	export function get_interactive_intersections_all(): any[] {
		return all_intersections.result
	}

	function set_cursor_style(css_value: string): void {
		// doesn't update the component on cursor change (as opposed to c.style)
		if (self.$$.root.style.cursor !== css_value) self.$$.root.style.cursor = css_value
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
			remove_interaction_0_listener()
			remove_interaction_0_listener = null
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
