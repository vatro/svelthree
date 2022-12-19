<!-- 
@component
This is a **svelthree** _Canvas_ Component.  
[ tbd ]  Link to Docs.
-->
<script context="module" lang="ts">
	type SvelthreeDefaultKeyboardListenerHost = "window" | "canvas" | "document" | undefined
	type CurrentComponentType = import("./Canvas.svelte").default
	interface DefaultKeyboardEventsListener {
		keydown?: (e: KeyboardEvent) => void
		keyup?: (e: KeyboardEvent) => void
		keypress?: (e: KeyboardEvent) => void
	}

	export interface IStateCanvas {
		readonly log_all: boolean
		readonly log_dev: { [P in keyof LogDEV]: LogDEV[P] } | undefined
		readonly log_rs: boolean
		readonly log_lc: { [P in keyof LogLC]: LogLC[P] } | undefined
		readonly id: string
		readonly style: string | undefined
		readonly change_cursor: boolean
		readonly interactive: boolean | undefined
		readonly pointer_listener_options: { capture: boolean }
		readonly on_pointerevents: ((e: PointerEvent) => void) | undefined
		readonly default_keyboard_listeners_host: SvelthreeDefaultKeyboardListenerHost
		readonly default_keyboardevents_listener: DefaultKeyboardEventsListener | undefined
		readonly keyboard_listener_options: { capture: boolean }
		readonly on_keyboardevents: ((e: KeyboardEvent) => void) | undefined
		readonly raycast: RaycastArray
		readonly recursive: boolean
		readonly tabindex: number | undefined
		readonly aria: Partial<ARIAMixin> | undefined
		readonly onMountReplace: SvelthreeLifecycleCallback<CurrentComponentType> | undefined
		readonly onDestroyStart: SvelthreeLifecycleCallback<CurrentComponentType> | undefined
		readonly onDestroyEnd: SvelthreeLifecycleCallback<CurrentComponentType> | undefined
		readonly onDestroyReplace: SvelthreeLifecycleCallback<CurrentComponentType> | undefined
		readonly beforeUpdateReplace: SvelthreeLifecycleCallback<CurrentComponentType> | undefined
		readonly afterUpdateReplace: SvelthreeLifecycleCallback<CurrentComponentType> | undefined
	}
</script>

<script lang="ts">
	// #region --- Imports

	import { afterUpdate, beforeUpdate, onMount, onDestroy, setContext, createEventDispatcher } from "svelte"
	import { get_current_component } from "svelte/internal"
	import { Raycaster, Vector2, Vector3 } from "three"
	import type { Object3D } from "three"
	import { svelthreeStores } from "../stores/index.js"
	import { SvelthreeStoreArray } from "../utils/SvelthreeStoreArray.js"
	import type {
		PointerState,
		StoreBody,
		AllIntersections,
		CanvasComponentEventDispatcher,
		AllIntersectionsResult,
		SvelthreeInteractableComponent
	} from "../types/types-extra.js"
	import { c_rs, c_lc, c_dev, verbose_mode, get_comp_name } from "../utils/SvelthreeLogger.js"
	import type { LogLC, LogDEV } from "../utils/SvelthreeLogger.js"
	import { RaycastArray } from "../utils/RaycastArray.js"
	import { writable } from "svelte/store"
	import type { Writable } from "svelte/store"
	import type { SvelthreeSupportedInteractionEvent, SvelthreeLifecycleCallback } from "../types/types-extra.js"

	/**
	 * SVELTEKIT  SSR
	 * `browser` is needed for the SvelteKit setup (SSR / CSR / SPA).
	 * For non-SSR output in RollUp only and Vite only setups (CSR / SPA) we're just mimicing `$app/environment` where `browser = true`,
	 * -> TS fix: `$app/environment` mapped to `src/$app/environment` via svelthree's `tsconfig.json`'s `path` property.
	 * -> RollUp only setup: replace `$app/environment` with `../$app/environment`
	 * The import below will work out-of-the-box in a SvelteKit setup.
	 */
	const browser = !import.meta.env.SSR

	const self = get_current_component()
	const c_name = get_comp_name(self)
	/** svelthree component's type (e.g. `type` prop value of component `Foo` will be `'Foo'`) */
	export const type: string = c_name
	const verbose: boolean = verbose_mode()

	const dispatch = createEventDispatcher<CanvasComponentEventDispatcher>()

	export let log_all = false
	export let log_dev: { [P in keyof LogDEV]: LogDEV[P] } | undefined = log_all ? { all: true } : undefined
	export let log_rs: boolean = log_all
	export let log_lc: { [P in keyof LogLC]: LogLC[P] } | undefined = log_all ? { all: true } : undefined

	// #endregion

	export const is_svelthree_component = true
	export const is_svelthree_canvas = true

	// #region --- Required Attributes

	export let w: number
	export let h: number

	// #endregion

	// #region --- Optional Attributes

	/** The `id` of the `Canvas` DOMElement. */
	export let id = ""

	export let style: string | undefined = undefined
	let clazz: string | undefined = undefined
	export { clazz as class }

	/** If `true` (_default_) the cursor will change automatically (_e.g. over/out canvas DOM element, **interactive** objects or when using the `OrbitControls` component_). */
	export let change_cursor = true

	export let interactive: boolean | undefined = undefined
	$: if (interactive !== undefined) {
		if (store) {
			;($svelthreeStores[sti] as StoreBody).canvas.interactive = interactive
		} else {
			console.error("SVELTHREE > Canvas > Couldn't set 'interactive' status, 'store' not avialble!", { store })
		}
	}

	/**
	 * Set listener options for all pointer listeners ( _internally_ ) bound directly to:
	 * - the `<canvas>` element
	 *
	 *  TODO : this is just a basic implementation, not much tested ( _other use cases_ ) yet.
	 * */
	export let pointer_listener_options: { capture: boolean } = { capture: true }
	const pointer_capture = pointer_listener_options.capture

	/**
	 * A function (_event handler_) which will be executed **_right before_** a **registered** (_used by an interactive component_) and
	 * `click` **related** ( **!** ) `PointerEvent` gets internally dispatched (_spread_) via the `Canvas` component to any
	 * interactive components using that event (_listening_).
	 *
	 * **Usage example**:
	 * ```
	 * on_pointerevents = { (e) => e.stopPropagation() }
	 * ```
	 * will prevent any `"click"`, `"pointerup"` or `"pointerdown"` events on the `<canvas>` element from bubbling up to it's parent DOM elements,
	 * e.g. a **click** on a deeply nested svelthree-canvas will not trigger `"click"` handlers on it's parent DOM elements.
	 *
	 * ☝️ _This will **NOT** affect event propagation inside the **svelthree shadow dom tree** / any modifiers specified by the `modifiers` prop._
	 */
	export let on_pointerevents: ((e: PointerEvent) => void) | undefined = undefined

	/**
	 * Specifies where to add `KeyboardEvent` listeners to.
	 *
	 * ☝️ _Note on **`default_keyboardevents_listener` usage**: if you're using the `KeyboardEvent` modifier **`"self"`**,  \
	 * you'll have to set `default_keyboard_listeners_host` to `"window"` or `"document"` in order for it to have effect._
	 * ---
	 * `"window"` (_default_)  \
	 * will explicitly add `KeyboardEvent` listeners to the `window` object.  \
	 * _in order for interactive components to react to keyboard input:_
	 * - the `<canvas>` element **doesn't need** to be **focusable / have focus**.
	 * - an **object** in a scene **doesn't need** to be **focusable / have focus**.
	 *
	 * _common usage scenario_:
	 * - You want your svelthree-app to **always** react to keyboard input.
	 * - You want to globally `.preventDefault()` some browser behavior on keyboard input.
	 * ---
	 * `"canvas"`  \
	 * will explicitly add `KeyboardEvent` listeners to the `<canvas>` element.  \
	 * _in order for interactive components to react to keyboard input:_
	 * - ☝️ the `<canvas>` element **has to be focusable / have focus**.
	 * - an **object** in a scene **doesn't need** to be **focusable / have focus**.
	 *
	 * _common usage scenario_:
	 * - You want your svelthree-app to react to keyboard input only when the `<canvas>` element is focused.
	 * - You want to `.preventDefault()` some browser behavior on keyboard input only if the `<canvas>` element is focused, but not for the rest of the page.
	 * ---
	 * `"document"`  \
	 * will explicitly add `KeyboardEvent` listeners to the `document` object.  \
	 * Same effect and usage scenarios as `"window"`.
	 *
	 */
	export let default_keyboard_listeners_host: SvelthreeDefaultKeyboardListenerHost = "window"
	let keyboard_listeners_host: Window | Document | HTMLCanvasElement | undefined = undefined

	/**
	 * Allows specifying a different handlers for _global_ `"keydown"`, `"keyup"` and `"keypress"` events.
	 * If defined, an additional listener will be added to the `default_keyboard_listeners_host` (_default: `window`_).
	 * 
	 * ☝️ _if you're using the `KeyboardEvent` modifier **`"self"`**:  \
	 * you have to set `default_keyboard_listeners_host` to `"window"` or `"document"`, otherwise `default_keyboardevents_listener` will have no effect!_
	 * 
	 * **Usage example**:
	 * ```
	 * default_keyboardevents_listener = {{
        keydown: (e) => { if (e.code === "ArrowDown") e.preventDefault() }
    }}
	 * ```
	 * will prevent scrolling down (_default browser behavior_) when the `ArrowDown` key was pressed.
	 * 
	 * ☝️ _This is an alternative to using the `on_keyboardevents` prop which allows you to specify a **single global (default)** `KeyboardEvent`
	 * handler without adding a new listener to the `default_keyboard_listeners_host` (default: `window`)._
	 */
	export let default_keyboardevents_listener: DefaultKeyboardEventsListener | undefined = undefined

	/**
	 * Set listener options for all keyboard listeners ( _internally_ ) bound to either:
	 *
	 * _specified by the `default_keyboard_listeners_host` prop, default: `window`_
	 * - the `window` object
	 * - the `document` object
	 * - the `<canvas>` element
	 *
	 *  TODO : this is just a basic implementation, not much tested ( _other use cases_ ) yet.
	 * */
	export let keyboard_listener_options: { capture: boolean } = { capture: true }
	const keyboard_capture = keyboard_listener_options.capture

	/**
	 * A function (_event handler_) which will be executed **_right before_** a **registered** (_used by an interactive component_) `KeyboardEvent`
	 * gets internally dispatched (_spread_) via the `Canvas` component to any interactive components using that event (_listening_).
	 *
	 * **Usage example**:
	 * ```
	 * on_keyboardevents = {(e) => {
	 * 	if (e.type === "keydown" && e.code === "ArrowDown") e.preventDefault()
	 * }}
	 * ```
	 * will prevent scrolling down (_default browser behavior_) when the `ArrowDown` key was pressed.
	 *
	 * ☝️ _This is an alternative to using the `default_keyboardevents_listener` prop which allows you specify
	 * a different handler for `"keydown"`, `"keyup"` and `"keypress"` event._
	 */
	export let on_keyboardevents: ((e: KeyboardEvent) => void) | undefined = undefined

	const canvas_interactivity: Writable<{ enabled: boolean | undefined }> = writable({ enabled: interactive })
	setContext("canvas_interactivity", canvas_interactivity)
	$: if (interactive !== undefined) $canvas_interactivity.enabled = interactive

	// #endregion

	// #region --- Store Body and Types

	const svelthreeStoreBody: StoreBody = {
		id: undefined,
		canvas: {
			dom: undefined,
			svelthreeComponent: self,
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

	let store = $svelthreeStores[sti]

	// canvas
	let c: HTMLCanvasElement

	$: if (c) {
		if (default_keyboard_listeners_host !== undefined) {
			switch (default_keyboard_listeners_host) {
				case "document":
					keyboard_listeners_host = document
					break
				case "window":
					keyboard_listeners_host = window
					break
				case "canvas":
					keyboard_listeners_host = c
					break
			}
		}
	}

	$: if (c && keyboard_listeners_host !== undefined && default_keyboardevents_listener !== undefined) {
		if (default_keyboardevents_listener.keydown)
			keyboard_listeners_host.addEventListener(
				"keydown",
				default_keyboardevents_listener.keydown as EventListener,
				keyboard_listener_options
			)
		if (default_keyboardevents_listener.keyup)
			keyboard_listeners_host.addEventListener(
				"keyup",
				default_keyboardevents_listener.keyup as EventListener,
				keyboard_listener_options
			)
		if (default_keyboardevents_listener.keypress)
			keyboard_listeners_host.addEventListener(
				"keypress",
				default_keyboardevents_listener.keypress as EventListener,
				keyboard_listener_options
			)
	}

	// IMPORTANT  reactive!
	const canvas_dom: Writable<{ element: HTMLCanvasElement | undefined }> = writable({ element: undefined })
	setContext("canvas_dom", canvas_dom)
	$: $canvas_dom.element = c

	// IMPORTANT  reactive!
	let sh_root: HTMLDivElement
	const shadow_root: Writable<{ element: ShadowRoot | null }> = writable({ element: null })
	setContext("shadow_root", shadow_root)

	/** Returns the shadow DOM root element. */
	export const get_shadow_root_el = (): ShadowRoot | null => $shadow_root.element

	$: if (sh_root) {
		$shadow_root.element = sh_root.attachShadow({ mode: "open", delegatesFocus: false })
	}

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
	let all_intersections: AllIntersections = { result: [] }
	setContext("all_intersections", all_intersections)

	// --- Interactivity ---

	let raycaster: Raycaster | null

	$: if (c && !interactive) {
		c.addEventListener("pointerenter", on_pointer_enter__not_interactive, pointer_listener_options)
		c.addEventListener("pointerleave", on_pointer_leave__not_interactive, pointer_listener_options)
	}

	// reactive create raycaster
	$: interactive && !raycaster && c && $svelthreeStores[sti]?.renderer ? createRaycaster() : null

	function createRaycaster() {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "createRaycaster > interactive", interactive))

		raycaster = new Raycaster()

		if (store) {
			;($svelthreeStores[sti] as StoreBody).raycaster = raycaster
			$canvas_interactivity.enabled = true

			if (store.renderer?.xr.enabled === false) {
				start_updating_pointer()
				add_interaction_0_listener()
			}

			if (verbose && log_dev) {
				console.info("SVELTHREE > Canvas : after Raycaster creation, store: ", store)
			}
		}
	}

	// reactively remove raycaster
	$: !interactive && raycaster && $svelthreeStores[sti]?.renderer ? remove_raycaster() : null

	function remove_raycaster() {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "remove_raycaster > interactive", interactive))

		if (store) {
			$canvas_interactivity.enabled = false
			;($svelthreeStores[sti] as StoreBody).raycaster = undefined
			raycaster = null

			remove_all_listeners()
		}

		if (verbose && log_rs) {
			console.debug(...c_rs(c_name, "after Raycaster remove, store:", store))
		}
	}

	/**
	 * Removes the `interaction_1` render event listener which updates all intersections, changes cursor appearance
	 * and updates / removes ( _unused_ ) `click` related event listeners bound to the `<canvas>` element.
	 */
	let remove_interaction_1_listener: (() => void) | undefined | null

	/**
	 * Adss the `interaction_1` render event listener.
	 * - `interaction_1` render event listener -> on every render:
	 *   - updates all intersections and changes cursor appearance.
	 *   - updates / removes ( _unused_ ) `click` related event listeners bound to the `<canvas>` element.
	 */
	function add_interaction_1_listener(): void {
		remove_interaction_1_listener = store?.rendererComponent?.$on("interaction_1", on_interaction_1)
	}

	function on_interaction_1(): void {
		update_all_intersections_and_cursor()
		update_canvas_listeners()
	}

	function add_pointermove_listeners(): void {
		// IMPORTANT  `pointermove` event listener is always needed except the `Canvas` component is not interactive.
		c.addEventListener("pointermove", update_pointer_state, pointer_listener_options)
		add_interaction_1_listener()
	}

	// start updating mouse position (if not xr)
	function start_updating_pointer(): void {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "createRaycaster > start_updating_pointer!"))

		add_pointermove_listeners()

		c.addEventListener("pointerenter", on_pointer_enter, pointer_listener_options)
		c.addEventListener("pointerleave", on_pointer_leave, pointer_listener_options)

		c.removeEventListener("pointerenter", on_pointer_enter__not_interactive, pointer_capture)
		c.removeEventListener("pointerleave", on_pointer_leave__not_interactive, pointer_capture)
	}

	function on_pointer_enter(): void {
		$pointer_over_canvas.status = true

		c.addEventListener("pointerleave", on_pointer_leave, pointer_listener_options)
		add_pointermove_listeners()
		c.removeEventListener("pointerenter", on_pointer_enter, pointer_capture)
	}

	function on_pointer_enter__not_interactive(): void {
		$pointer_over_canvas.status = true

		c.addEventListener("pointerleave", on_pointer_leave__not_interactive, pointer_listener_options)
		c.removeEventListener("pointerenter", on_pointer_enter__not_interactive, pointer_capture)

		if (change_cursor) {
			if (store) store.orbitcontrols.length > 0 ? set_cursor_style("all-scroll") : set_cursor_style("default")
		}
	}

	function on_pointer_leave__not_interactive(): void {
		$pointer_over_canvas.status = false

		c.addEventListener("pointerenter", on_pointer_enter__not_interactive, pointer_listener_options)
		c.removeEventListener("pointerleave", on_pointer_leave__not_interactive, pointer_capture)

		if (change_cursor) set_cursor_style("default")
	}

	function on_pointer_leave(): void {
		$pointer_over_canvas.status = false

		remove_pointermove_listeners()
		c.removeEventListener("pointerleave", on_pointer_leave, pointer_capture)
		c.addEventListener("pointerenter", on_pointer_enter, pointer_listener_options)

		if (change_cursor) set_cursor_style("default")
	}

	function remove_pointermove_listeners(): void {
		if (remove_interaction_1_listener) {
			remove_interaction_1_listener()
			remove_interaction_1_listener = null
		}

		c.removeEventListener("pointermove", update_pointer_state, pointer_capture)
	}

	/**
	 * Triggered on `pointermove` only -> saves pointer position etc. in the `pointer_state` object
	 * which is being internally shared via context / used for various interaction functionality.
	 */
	function update_pointer_state(e: PointerEvent): void {
		// prevent reacting to the bubbled (standard) 'pointermove' event from shadow dom
		if (e.target === c) {
			pointer_state.event = e

			// type 'ClientRect' is deprecated
			let rect: DOMRect = c.getBoundingClientRect()

			// we need this for the raycaster (intersections)
			// see: https://stackoverflow.com/questions/13542175/three-js-ray-intersect-fails-by-adding-div/13544277#13544277
			pointer_state.pos.x = ((e.clientX - rect.left) / (rect.right - rect.left)) * 2 - 1
			pointer_state.pos.y = -((e.clientY - rect.top) / (rect.bottom - rect.top)) * 2 + 1

			update_all_intersections_and_cursor()
		} else {
			if (verbose && log_dev)
				console.warn(
					`SVELTHREE > Canvas : Pointer event '${e.type}' bubbled up to <canvas> from the shadow dom target. Prevent this from happening by using the 'stopPropagation' modifier!`,
					e
				)
		}
	}

	/** Get the `pointer_state` object which is being internally shared via context / used for various interaction functionality. */
	export const get_pointer_state = (): { clientX: number; clientY: number } | undefined => {
		if (pointer_state.event) {
			return { clientX: pointer_state.event.clientX, clientY: pointer_state.event.clientY }
		} else {
			return undefined
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

	// Mark the `filtered_raycast` as `dirty` if the active Scene has changed.
	$: if ($svelthreeStores[sti]?.activeScene) filtered_raycast.dirty = true

	/**
	 * Removes the `interaction_0` render event listener.
	 * - `interaction_0` render event listener -> checks if the `filtered_raycast` object should be re-processed on every render.
	 */
	let remove_interaction_0_listener: (() => void) | undefined | null

	/** Adds the `interaction_0` render event listener -> checks if the `filtered_raycast` object should be re-processed on every render. */
	function add_interaction_0_listener(): void {
		remove_interaction_0_listener = store?.rendererComponent?.$on("interaction_0", check_filter_raycast)
	}

	/**
	 * Checks:
	 * - if the `raycast` array of objects to be raycasted has changed (is `dirty`) -> interactive objects have been added to / removed from the current Scene.
	 * - if the `filtered_raycast` is `dirty` -> the active Scene has changed.
	 * in case of any of the above calls `filter_raycast()` which will re-process the `filtered_raycast` object.
	 * */
	function check_filter_raycast(): void {
		if (raycast.dirty || filtered_raycast.dirty) {
			raycast.dirty = false
			filter_raycast()
		}
	}

	/** Populates the `filtered_raycast.objects` array with objects being interactive ( _raycast enabled_ ) children of the currently active Scene. */
	function filter_raycast(): void {
		filtered_raycast.objects = []

		for (let i = 0; i < raycast.length; i++) {
			const obj: Object3D = raycast[i]
			if (obj.userData.root_scene) {
				if (obj.userData.root_scene === store?.activeScene) {
					filtered_raycast.objects.push(obj)
				} else {
					/* nothing, object will not be raycasted */
				}
			} else {
				console.error(`SVELTHREE > Canvas > filter_raycast > no 'obj.userData.root_scene'!`, { obj })
			}
		}

		filtered_raycast.dirty = false
	}

	/**
	 * - If `true` (_default_), the interaction (_pointer intersections_) [`Raycaster`](https://threejs.org/docs/index.html?q=raycaster#api/en/core/Raycaster)
	 * will also check all descendants of interactive objects.
	 * - If set to `false` the interaction Raycaster will only check intersection with interactive objects.
	 */
	export let recursive = true

	/** Updates the `all_intersections.result` array and changes the pointer appearance if the `change_cursor` prop is set to `true`.*/
	function update_all_intersections_and_cursor(): void {
		if (raycaster && interactive && $pointer_over_canvas.status === true && store?.activeCamera !== undefined) {
			raycaster.setFromCamera(pointer_state.pos, store.activeCamera as THREE.Camera)
			all_intersections.result = raycaster.intersectObjects(filtered_raycast.objects, recursive)

			if (change_cursor) {
				if (
					all_intersections.result.length &&
					all_intersections.result[0].object.userData.interact &&
					!all_intersections.result[0].object.userData.block
				) {
					set_cursor_style("pointer")
				} else {
					store.orbitcontrols.length > 0 ? set_cursor_style("all-scroll") : set_cursor_style("default")
				}
			}
		}

		if (pointer_state.event) dispatch("canvas_pointermove", { event: pointer_state.event })
	}

	function set_cursor_style(css_value: string): void {
		// doesn't update the component on cursor change (as opposed to c.style)
		if (self.$$.root.style.cursor !== css_value) self.$$.root.style.cursor = css_value
	}

	// reactively clear intersections if pointer is out of the `<canvas>` element.
	$: if ($pointer_over_canvas.status === false) {
		all_intersections.result = []
	}

	// --- `click` related events management ---

	interface ICanvasListenersMapValue {
		total?: number
		add?: () => void
		remove?: () => void
	}

	/** `click` **related** ( **!** ) `PointerEvent` listeners only + `KeyboardEvent` listeners +  TODO : `WheelEvent` listeners! */
	const canvas_listeners = new Map<SvelthreeSupportedInteractionEvent, ICanvasListenersMapValue>()

	/**
	 * Called internally by `SvelthreeInteraction.register_event(...)`
	 * Adds
	 * - `click` **related** ( **!** ) `PointerEvent` listeners only
	 * - `KeyboardEvent` listeners
	 * -  TODO : `WheelEvent` listeners
	 *
	 * to the `<canvas>` element if not already present.
	 */
	export const register_canvas_listener = (event_name: SvelthreeSupportedInteractionEvent) => {
		//console.log("register_canvas_listener!")

		if (!canvas_listeners.has(event_name)) {
			switch (event_name) {
				case "click":
				case "pointerdown":
				case "pointerup":
					canvas_listeners.set(event_name, {
						total: 1
					})

					c.addEventListener(event_name, on_pointer_event_listener as EventListener, pointer_listener_options)

					break
				case "keydown":
				case "keyup":
				case "keypress":
					canvas_listeners.set(event_name, {
						total: 1
					})

					if (keyboard_listeners_host) {
						keyboard_listeners_host.addEventListener(
							event_name,
							on_keyboard_event_listener as EventListener,
							keyboard_listener_options
						)
					} else {
						console.error(
							"SVELTHREE > Canvas > register_canvas_listener : Couldn't register 'Canvas' keyboard-listener, 'keyboard_listeners_host' not available!",
							{ keyboard_listeners_host }
						)
					}
					break
				default:
					break
			}
		} else {
			// update event usage count.
			// if the event is not being used (total = 0), the corresponding listener will be removed.
			increase_listener_usage_for_event(event_name)
		}
	}

	/**
	 * Spread a pointer event to all interactive components.
	 * `SvelthreeInteraction` component will listen / react to this if it's using the corresponding pointer event.
	 */
	function on_pointer_event_listener(e: PointerEvent) {
		if (e.target === c) {
			if (on_pointerevents && typeof on_pointerevents === "function") on_pointerevents(e)
			dispatch(`canvas_${e.type}`, { event: e })
		}
	}

	/**
	 * Spread a keyboard event to all interactive components.
	 * `SvelthreeInteraction` component will listen / react to this if it's using the corresponding keyboard event.
	 */
	function on_keyboard_event_listener(e: KeyboardEvent) {
		// TODO  clarify: in Chrome `e.target` is always `document.body` regardless if we've added the listener to `window` or `document`.
		if (e.target === document.body || e.target === document || e.target === c) {
			if (on_keyboardevents && typeof on_keyboardevents === "function") on_keyboardevents(e)
			dispatch(`canvas_${e.type}`, { event: e })
		}
	}

	/**
	 * Decreases the usage counter of a certain event listener type.
	 * Called internally by `SvelthreeInteraction.unregister_pointer_event(...)`.
	 */
	export const unregister_canvas_listener = (event_name: SvelthreeSupportedInteractionEvent) => {
		if (canvas_listeners.has(event_name)) {
			// update pointer event usage count
			// if the event is not being used (total = 0), the corresponding listener will be removed.
			decrease_listener_usage_for_event(event_name)
			update_canvas_listeners()
		} else {
			// silently nothing
			//console.error(`SVELTHREE > Canvas : tried to unregister non-existant pointer listener.`)
		}
	}

	function increase_listener_usage_for_event(event_name: SvelthreeSupportedInteractionEvent) {
		const listener_obj = canvas_listeners.get(event_name)
		if (listener_obj) {
			if (listener_obj.total) {
				listener_obj.total += 1
			} else {
				console.error(
					"SVELTHREE > Canvas > register_canvas_listener : Couldn't increase 'Canvas' listener usage count, 'listener_obj.total' not available!",
					{ total: listener_obj.total }
				)
			}
		} else {
			console.error(
				"SVELTHREE > Canvas > register_canvas_listener : Couldn't increase 'Canvas' listener usage count, 'listener_obj' not available!",
				{ listener_obj }
			)
		}
	}

	function decrease_listener_usage_for_event(event_name: SvelthreeSupportedInteractionEvent) {
		const listener_obj = canvas_listeners.get(event_name)
		if (listener_obj) {
			if (listener_obj.total) {
				listener_obj.total -= 1
			} else {
				console.error(
					"SVELTHREE > Canvas > register_canvas_listener : Couldn't decrease 'Canvas' listener usage count, 'listener_obj.total' not available!",
					{ total: listener_obj.total }
				)
			}
		} else {
			console.error(
				"SVELTHREE > Canvas > register_canvas_listener : Couldn't decrease 'Canvas' listener usage count, 'listener_obj' not available!",
				{ listener_obj }
			)
		}
	}

	/**
	 * Remove an event listener if safe -> is not being used (_anymore_) by any of the interactive components.
	 * - Called after a `click` **related** ( **!** ) event was unregistered by one of the interactive components.
	 * - Called on every render, see `Canvas.on_interaction_1(...)`.
	 */
	function update_canvas_listeners(): void {
		for (const [event_name, usage_count] of canvas_listeners.entries()) {
			if (usage_count.total === 0) {
				switch (event_name) {
					case "click":
					case "pointerdown":
					case "pointerup":
						c.removeEventListener(event_name, on_pointer_event_listener as EventListener, pointer_capture)
						break
					case "keydown":
					case "keyup":
					case "keypress":
						document.removeEventListener(event_name, on_keyboard_event_listener, keyboard_capture)
						break
					default:
						break
				}
				canvas_listeners.delete(event_name)
			}
		}
	}

	// --- Accessabilty ---

	export let tabindex: number | undefined = undefined
	export let aria: Partial<ARIAMixin> | undefined = undefined

	$: if (c && browser) {
		if (tabindex !== undefined) c.tabIndex = tabindex
		if (aria !== undefined) {
			// TODO  is this ok like this?
			Object.assign(c, aria)
		}
	}

	// --- Public methods ---

	/** Get all interactive **three.js object instances** from the currently active (_rendered_) Scene. */
	export const get_interactive = (): Object3D[] => {
		return filtered_raycast.objects
	}

	/** Get all interactive **svelthree components** from the currently active (_rendered_) Scene. */
	export const get_interactive_components = (): SvelthreeInteractableComponent[] => {
		return filtered_raycast.objects.map((item: Object3D) => {
			return item.userData.svelthreeComponent
		})
	}

	/** Get all interactive **three.js object instances** from all Scenes inside the Canvas. */
	export const get_interactive_all = (): Object3D[] => {
		return [...raycast]
	}

	/** Get all interactive **svelthree components** from all Scenes inside the Canvas. */
	export const get_interactive_components_all = (): Object3D[] => {
		return raycast.map((item: Object3D) => {
			return item.userData.svelthreeComponent
		})
	}

	/** Get all interactive **three.js object instances** intersected by the ray (pointer). */
	export const get_interactive_intersections_all = (): AllIntersectionsResult => all_intersections.result

	export const getDomElement = (): HTMLCanvasElement => c
	export const getDomElementDimensions = (): { w: number; h: number } => {
		return { w, h }
	}

	// --- Lifecycle ---

	/**
	 * Removes all / all kinds of listeners bound to the `Canvas` component or the `<canvas>` element.
	 * - Called ( _reactively_ ) by `remove_raycaster()` if the `Canvas` component was set as **not** interactive.
	 * - Called on `Canvas` component's destruction.
	 * */
	function remove_all_listeners(): void {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "remove_all_listeners!"))

		// ($on) render listeners
		if (remove_interaction_0_listener) {
			remove_interaction_0_listener()
			remove_interaction_0_listener = null
		}

		if (remove_interaction_1_listener) {
			remove_interaction_1_listener()
			remove_interaction_1_listener = null
		}

		// pointer listeners
		// SVELTEKIT  SSR /
		if (browser) {
			c.removeEventListener("pointermove", update_pointer_state, pointer_capture)

			c.removeEventListener("pointerenter", on_pointer_enter, pointer_capture)
			c.removeEventListener("pointerleave", on_pointer_leave, pointer_capture)
			c.removeEventListener("pointerenter", on_pointer_enter__not_interactive, pointer_capture)
			c.removeEventListener("pointerleave", on_pointer_leave__not_interactive, pointer_capture)

			c.removeEventListener("click", on_pointer_event_listener as EventListener, pointer_capture)
			c.removeEventListener("pointerdown", on_pointer_event_listener, pointer_capture)
			c.removeEventListener("pointerup", on_pointer_event_listener, pointer_capture)

			if (keyboard_listeners_host) {
				keyboard_listeners_host.removeEventListener(
					"keydown",
					on_keyboard_event_listener as EventListener,
					keyboard_capture
				)
				keyboard_listeners_host.removeEventListener(
					"keyup",
					on_keyboard_event_listener as EventListener,
					keyboard_capture
				)
				keyboard_listeners_host.removeEventListener(
					"keypress",
					on_keyboard_event_listener as EventListener,
					keyboard_capture
				)

				if (default_keyboardevents_listener) {
					if (default_keyboardevents_listener.keydown)
						keyboard_listeners_host.removeEventListener(
							"keydown",
							default_keyboardevents_listener.keydown as EventListener,
							keyboard_capture
						)
					if (default_keyboardevents_listener.keyup)
						keyboard_listeners_host.removeEventListener(
							"keyup",
							default_keyboardevents_listener.keyup as EventListener,
							keyboard_capture
						)
					if (default_keyboardevents_listener.keypress)
						keyboard_listeners_host.removeEventListener(
							"keypress",
							default_keyboardevents_listener.keypress as EventListener,
							keyboard_capture
						)
				}
			} else {
				// TODO  fail silently?
			}
		}
	}

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
					if (verbose && log_dev) {
						console.debug(...c_dev(c_name, "onMount -> store", store))
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

					if (onDestroyStart) {
						if (onDestroyStart.constructor.name === "AsyncFunction") {
							await onDestroyStart(self)
						} else {
							onDestroyStart(self)
						}
					}

					remove_all_listeners()
					// if canvas is being removed set the the whole store to 'null'
					// this way we don't have to handle anything, other store 'sti' will remain valid
					// any newly added canvas will create a new store at the next highest index
					// the value of 'sti' is completely irrelevant to the user, doesn't need to be handled.
					$svelthreeStores[sti] = null

					// if all stores are `null` we can safely reset the `svelthreeStores` array, e.g. when switching pages / routes.
					if (all_stores_are_null()) {
						$svelthreeStores = []
					} else {
						// trim `svelthreeStores` array's tail
						trim_stores_array()
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

	function all_stores_are_null(): boolean {
		for (let i = 0; i < $svelthreeStores.length; i++) {
			if ($svelthreeStores[i] !== null) {
				return false
			}
		}
		return true
	}

	function trim_stores_array(): void {
		let start_index: number | undefined

		for (let i = $svelthreeStores.length - 1; i > 0; i--) {
			if ($svelthreeStores[i] === null && $svelthreeStores[i - 1] !== null) {
				start_index = i
				break
			} else if ($svelthreeStores[i] !== null) {
				break
			}
		}

		if (start_index !== undefined) {
			const trim_length: number = $svelthreeStores.length - start_index
			$svelthreeStores.splice(start_index, trim_length)
		}
	}

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
			  }
	)

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
			  }
	)
	export const state = (): Partial<IStateCanvas> => {
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
					id,
					style,
					change_cursor,
					interactive,
					pointer_listener_options,
					on_pointerevents,
					default_keyboard_listeners_host,
					default_keyboardevents_listener,
					keyboard_listener_options,
					on_keyboardevents,
					raycast,
					recursive,
					tabindex,
					aria,
					onMountReplace,
					onDestroyStart,
					onDestroyEnd,
					onDestroyReplace,
					beforeUpdateReplace,
					afterUpdateReplace
				}
			},
			writable: false
		})
	}
</script>

<canvas {id} data-kind="svelthree_canvas" bind:this={c} width={w} height={h} {style} class={clazz} />
<!-- IMPORTANT  any objects with 'tabindex' specified will receive focus -->
<div bind:this={sh_root} data-kind="svelthree_shadow_dom_root" style="height: 0; width: 0; overflow: hidden;">
	<slot />
</div>
