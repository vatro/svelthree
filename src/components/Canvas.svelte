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

	import { afterUpdate, beforeUpdate, onMount, onDestroy, setContext, createEventDispatcher } from "svelte"
	import { get_current_component } from "svelte/internal"
	import { self as _self } from "svelte/internal"
	import { Raycaster, Vector2, Vector3 } from "three"
	import type { Object3D } from "three"
	import { svelthreeStores } from "svelthree/stores"
	import { SvelthreeStoreArray } from "../utils/SvelthreeStoreArray"
	import type { PointerState, StoreBody, WebGLRendererMode } from "../types-extra"
	import { c_rs, c_lc, c_dev, verbose_mode, get_comp_name } from "../utils/SvelthreeLogger"
	import type { LogLC, LogDEV } from "../utils/SvelthreeLogger"
	import { RaycastArray } from "../utils/RaycastArray"
	import { writable } from "svelte/store"
	import type { Writable } from "svelte/store"
	import type { SvelthreeSupportedPointerEvent, SvelthreeSupportedInteractionEvent } from "../constants/Interaction"

	/**
	 * SVELTEKIT  SSR
	 * `browser` is needed for the SvelteKit setup (SSR / CSR / SPA).
	 * For non-SSR output in RollUp only and Vite only setups (CSR / SPA) we're just mimicing `$app/env` where `browser = true`,
	 * -> TS fix: `$app/env` mapped to `src/$app/env` via svelthree's `tsconfig.json`'s `path` property.
	 * -> RollUp only setup: replace `$app/env` with `../$app/env`
	 * The import below will work out-of-the-box in a SvelteKit setup.
	 */
	import { browser } from "$app/env"

	const self = get_current_component()
	const c_name = get_comp_name(self)
	const verbose: boolean = verbose_mode()

	const dispatch: (type: string, detail?: any) => void = createEventDispatcher()

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

	export let name: string = undefined

	export let style: string = undefined
	let clazz: string = undefined
	export { clazz as class }

	/** If `true` (_default_) the cursor will change automatically (_e.g. over/out canvas DOM element, **interactive** objects or when using the `OrbitControls` component_). */
	export let change_cursor: boolean = true

	export let interactive: boolean = undefined

	/**
	 * Set listener options for all pointer listeners ( _internally_ ) bound directly to:
	 * - the `<canvas>` element
	 *
	 *  TODO : this is just a basic implementation, not much tested ( _other use cases_ ) yet.
	 * */
	export let pointer_listener_options = { capture: true }
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
	export let on_pointerevents: (e: PointerEvent) => void = undefined

	type SvelthreeDefaultKeyboardListenerHost = "window" | "canvas" | "document" | undefined

	/**
	 * Specifies where to add `KeyboardEvent` listeners to.
	 *
	 * ☝️ _Note on **`default_keyboardevents_handler` usage**: if you're using the `KeyboardEvent` modifier **`"self"`**,  \
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
	let keyboard_listeners_host: Window | Document | HTMLCanvasElement = undefined

	interface DefaultKeyboardEventsHandler {
		keydown?: (e: KeyboardEvent) => void
		keyup?: (e: KeyboardEvent) => void
		keypress?: (e: KeyboardEvent) => void
	}
	/**
	 * Allows specifying a different handlers for _global_ `"keydown"`, `"keyup"` and `"keypress"` events.
	 * If defined, an additional listener will be added to the `default_keyboard_listeners_host` (_default: `window`_).
	 * 
	 * ☝️ _if you're using the `KeyboardEvent` modifier **`"self"`**:  \
	 * you have to set `default_keyboard_listeners_host` to `"window"` or `"document"`, otherwise `default_keyboardevents_handler` will have no effect!_
	 * 
	 * **Usage example**:
	 * ```
	 * default_keyboardevents_handler = {{
        keydown: (e) => { if (e.code === "ArrowDown") e.preventDefault() }
    }}
	 * ```
	 * will prevent scrolling down (_default browser behavior_) when the `ArrowDown` key was pressed.
	 * 
	 * ☝️ _This is an alternative to using the `on_keyboardevents` prop which allows you to specify a **single global (default)** `KeyboardEvent`
	 * handler without adding a new listener to the `default_keyboard_listeners_host` (default: `window`)._
	 */
	export let default_keyboardevents_handler: DefaultKeyboardEventsHandler | undefined = undefined

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
	export let keyboard_listener_options = { capture: true }
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
	 * ☝️ _This is an alternative to using the `default_keyboardevents_handler` prop which allows you specify
	 * a different handler for `"keydown"`, `"keyup"` and `"keypress"` event._
	 */
	export let on_keyboardevents: (e: KeyboardEvent) => void = undefined

	const canvas_interactivity: Writable<{ enabled: boolean }> = writable({ enabled: interactive })
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

	$: if (c && keyboard_listeners_host !== undefined && default_keyboardevents_handler !== undefined) {
		if (default_keyboardevents_handler.keydown)
			keyboard_listeners_host.addEventListener(
				"keydown",
				default_keyboardevents_handler.keydown,
				keyboard_listener_options
			)
		if (default_keyboardevents_handler.keyup)
			keyboard_listeners_host.addEventListener(
				"keyup",
				default_keyboardevents_handler.keyup,
				keyboard_listener_options
			)
		if (default_keyboardevents_handler.keypress)
			keyboard_listeners_host.addEventListener(
				"keypress",
				default_keyboardevents_handler.keypress,
				keyboard_listener_options
			)
	}

	// IMPORTANT  reactive!
	const canvas_dom: Writable<{ element: HTMLCanvasElement }> = writable({ element: c })
	setContext("canvas_dom", canvas_dom)
	$: $canvas_dom.element = c

	// IMPORTANT  reactive!
	let sh_root: HTMLDivElement
	const shadow_root: Writable<{ element: ShadowRoot }> = writable({ element: null })
	setContext("shadow_root", shadow_root)

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
	let all_intersections: { result: any[] } = { result: [] }
	setContext("all_intersections", all_intersections)

	// --- Interactivity ---

	let raycaster: Raycaster

	$: if (c && !interactive) {
		c.addEventListener("pointerenter", on_pointer_enter__not_interactive, pointer_listener_options)
		c.addEventListener("pointerleave", on_pointer_leave__not_interactive, pointer_listener_options)
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
			start_updating_pointer()
			add_interaction_0_listener()
		}

		if (verbose && log_dev) {
			console.info(
				"SVELTHREE > Canvas : after Raycaster creation, $svelthreeStores[sti]: ",
				$svelthreeStores[sti]
			)
		}
	}

	// reactively remove raycaster
	$: !interactive && raycaster && $svelthreeStores[sti].renderer ? remove_raycaster() : null

	function remove_raycaster() {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "remove_raycaster > interactive", interactive))

		$canvas_interactivity.enabled = false
		$svelthreeStores[sti].raycaster = undefined
		raycaster = null

		remove_all_listeners()

		if (verbose && log_rs) {
			console.debug(...c_rs(c_name, "after Raycaster remove, $svelthreeStores[sti]:", $svelthreeStores[sti]))
		}
	}

	/**
	 * Removes the `interaction_1` render event listener which updates all intersections, changes cursor appearance
	 * and updates / removes ( _unused_ ) `click` related event listeners bound to the `<canvas>` element.
	 */
	let remove_interaction_1_listener: () => void

	/**
	 * Adss the `interaction_1` render event listener.
	 * - `interaction_1` render event listener -> on every render:
	 *   - updates all intersections and changes cursor appearance.
	 *   - updates / removes ( _unused_ ) `click` related event listeners bound to the `<canvas>` element.
	 */
	function add_interaction_1_listener(): void {
		remove_interaction_1_listener = $svelthreeStores[sti].rendererComponent.$on("interaction_1", on_interaction_1)
	}

	function on_interaction_1(e: CustomEvent): void {
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
			$svelthreeStores[sti].orbitcontrols.length > 0
				? set_cursor_style("all-scroll")
				: set_cursor_style("default")
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
	export function get_pointer_state() {
		if (pointer_state.event) {
			return { clientX: pointer_state.event.clientX, clientY: pointer_state.event.clientY }
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
	$: if ($svelthreeStores[sti].activeScene) filtered_raycast.dirty = true

	/**
	 * Removes the `interaction_0` render event listener.
	 * - `interaction_0` render event listener -> checks if the `filtered_raycast` object should be re-processed on every render.
	 */
	let remove_interaction_0_listener: () => void

	/** Adds the `interaction_0` render event listener -> checks if the `filtered_raycast` object should be re-processed on every render. */
	function add_interaction_0_listener(): void {
		remove_interaction_0_listener = $svelthreeStores[sti].rendererComponent.$on(
			"interaction_0",
			check_filter_raycast
		)
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
				if (obj.userData.root_scene === $svelthreeStores[sti].activeScene) {
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
	export let recursive: boolean = true

	/** Updates the `all_intersections.result` array and changes the pointer appearance if the `change_cursor` prop is set to `true`.*/
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

		dispatch("canvas_pointermove", { event: pointer_state.event })
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
	export function register_canvas_listener(event_name: SvelthreeSupportedInteractionEvent) {
		//console.log("register_canvas_listener!")
		if (!canvas_listeners.has(event_name)) {
			switch (event_name) {
				case "click":
				case "pointerdown":
				case "pointerup":
					canvas_listeners.set(event_name, {
						total: 1
					})

					c.addEventListener(event_name, on_pointer_event_handler, pointer_listener_options)

					break
				case "keydown":
				case "keyup":
				case "keypress":
					canvas_listeners.set(event_name, {
						total: 1
					})

					keyboard_listeners_host.addEventListener(
						event_name,
						on_keyboard_event_handler,
						keyboard_listener_options
					)
					break
				default:
					break
			}
		} else {
			// update event usage count.
			// if the event is not being used (total = 0), the corresponding listener will be removed.
			canvas_listeners.get(event_name).total += 1
		}
	}

	/**
	 * Spread a pointer event to all interactive components.
	 * `SvelthreeInteraction` component will listen / react to this if it's using the corresponding pointer event.
	 */
	function on_pointer_event_handler(e: PointerEvent) {
		if (e.target === c) {
			if (on_pointerevents && typeof on_pointerevents === "function") on_pointerevents(e)
			dispatch(`canvas_${e.type}`, { event: e })
		}
	}

	/**
	 * Spread a keyboard event to all interactive components.
	 * `SvelthreeInteraction` component will listen / react to this if it's using the corresponding keyboard event.
	 */
	function on_keyboard_event_handler(e: KeyboardEvent) {
		// TODO  clarify: in Chrome `e.target` is always `document.body` regardless if we've added the listener to `window` or `document`.
		if (e.target === document.body || e.target === document || e.target === c) {
			if (on_keyboardevents && typeof on_keyboardevents === "function") on_keyboardevents(e)
			dispatch(`canvas_${e.type}`, { event: e })
		}
	}

	/**
	 * Decreased the usage counter of a `click` **related** ( **!** ) event listener.
	 * Called internally by `SvelthreeInteraction.unregister_pointer_event(...)`.
	 */
	export function unregister_canvas_listener(event_name: SvelthreeSupportedPointerEvent) {
		if (canvas_listeners.has(event_name)) {
			// update pointer event usage count
			// if the event is not being used (total = 0), the corresponding listener will be removed.
			canvas_listeners.get(event_name).total -= 1
			update_canvas_listeners()
		} else {
			// silently nothing
			//console.error(`SVELTHREE > Canvas : tried to unregister non-existant pointer listener.`)
		}
	}

	/**
	 * Remove a `click` **related** ( **!** ) event listener if safe -> is not being used (_anymore_) by any of the interactive components.
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
						c.removeEventListener(event_name, on_pointer_event_handler, pointer_capture)
						break
					case "keydown":
					case "keyup":
					case "keypress":
						document.removeEventListener(event_name, on_keyboard_event_handler, keyboard_capture)
						break
					default:
						break
				}
				canvas_listeners.delete(event_name)
			}
		}
	}

	// --- Accessabilty ---

	export let tabindex: number = undefined
	export let aria: Partial<ARIAMixin> = undefined

	$: if (c && browser) {
		if (tabindex !== undefined) c.tabIndex = tabindex
		if (aria !== undefined) {
			for (const key in aria) {
				c[key] = aria[key]
			}
		}
	}

	// --- Public methods ---

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

			c.removeEventListener("click", update_pointer_state, pointer_capture)
			c.removeEventListener("pointerdown", on_pointer_enter, pointer_capture)
			c.removeEventListener("pointerup", on_pointer_leave, pointer_capture)

			keyboard_listeners_host.removeEventListener("keydown", on_keyboard_event_handler, keyboard_capture)
			keyboard_listeners_host.removeEventListener("keyup", on_keyboard_event_handler, keyboard_capture)
			keyboard_listeners_host.removeEventListener("keypress", on_keyboard_event_handler, keyboard_capture)

			if (default_keyboardevents_handler) {
				if (default_keyboardevents_handler.keydown)
					keyboard_listeners_host.removeEventListener(
						"keydown",
						default_keyboardevents_handler.keydown,
						keyboard_capture
					)
				if (default_keyboardevents_handler.keyup)
					keyboard_listeners_host.removeEventListener(
						"keyup",
						default_keyboardevents_handler.keyup,
						keyboard_capture
					)
				if (default_keyboardevents_handler.keypress)
					keyboard_listeners_host.removeEventListener(
						"keypress",
						default_keyboardevents_handler.keypress,
						keyboard_capture
					)
			}
		}
	}

	onMount(async () => {
		if (verbose && log_lc && (log_lc.all || log_lc.om)) console.info(...c_lc(c_name, "onMount"))
		if (verbose && log_dev) {
			console.debug(...c_dev(c_name, "onMount -> $svelthreeStores[sti]", $svelthreeStores[sti]))
		}
	})

	onDestroy(async () => {
		if (verbose && log_lc && (log_lc.all || log_lc.od)) console.info(...c_lc(c_name, "onDestroy"))
		remove_all_listeners()
		// if canvas is being removed set the the whole store to 'null'
		// this way we don't have to handle anything, other store 'sti' will remain valid
		// any newly added canvas will create a new store at the next highest index
		// the value of 'sti' is completely irrelevant to the user, doesn't need to be handled.
		$svelthreeStores[sti] = null
	})

	beforeUpdate(async () => {
		if (verbose && log_lc && (log_lc.all || log_lc.bu)) console.info(...c_lc(c_name, "beforeUpdate"))
	})

	afterUpdate(async () => {
		if (verbose && log_lc && (log_lc.all || log_lc.au)) console.info(...c_lc(c_name, "afterUpdate"))
	})
</script>

<canvas data-kind="svelthree_canvas" bind:this={c} width={w} height={h} {style} class={clazz}>
	<slot />
</canvas>
<!-- IMPORTANT  if we put 'svelthree_shadow_dom_root' inside canvas tabbing / focus will not work! -->
<!-- IMPORTANT  any objects with 'tabindex' specified will receive focus -->
<div bind:this={sh_root} data-kind="svelthree_shadow_dom_root" style="height: 0; width: 0; overflow: hidden;" />
