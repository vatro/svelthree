<!--
`accessors:true` hast to be set per component because of the svelte-language-server bug, otherwise accessors would be falsely detected as missing and highlighted as errors.
svelthree uses svelte-accmod, where accessors are always `true`, regardless of `svelte:options`.  
-->
<svelte:options accessors />

<!-- 
@component
This is a **svelthree** _SvelthreeInteraction_ Component.  
[ tbd ]  Link to Docs.
-->
<script lang="ts">
	import { onMount, beforeUpdate, afterUpdate, onDestroy, getContext } from "svelte"
	import { get_current_component, SvelteComponentDev } from "svelte/internal"
	import { Object3D, Raycaster, Vector3 } from "three"
	import { svelthreeStores } from "svelthree/stores"
	import { c_dev, c_lc_int, verbose_mode, get_comp_name_int } from "../utils/SvelthreeLogger"
	import type { LogLC, LogDEV } from "../utils/SvelthreeLogger"
	import type { PointerState, SvelthreeShadowDOMElement } from "../types-extra"
	import type { Writable } from "svelte/store"
	import {
		KEYBOARD_EVENTS,
		FOCUS_EVENTS,
		POINTER_EVENTS,
		SUPPORTED_MODIFIERS_SET,
		ADD_EVENT_LISTENER_OPTIONS_SET
	} from "../constants/Interaction"
	import type {
		SvelthreeSupportedInteractionEvent,
		SupportedAddEventListenerOption,
		SvelthreeSupportedModifier,
		SvelthreeModifiersProp,
		SvelthreeSupportedKeyboardEvent,
		SvelthreeSupportedFocusEvent,
		SvelthreeSupportedPointerEvent
	} from "../constants/Interaction"

	/**
	 * SVELTEKIT  SSR
	 * `browser` is needed for the SvelteKit setup (SSR / CSR / SPA).
	 * For non-SSR output in RollUp only and Vite only setups (CSR / SPA) we're just mimicing `$app/env` where `browser = true`,
	 * -> TS fix: `$app/env` mapped to `src/$app/env` via svelthree's `tsconfig.json`'s `path` property.
	 * -> RollUp only setup: replace `$app/env` with `../$app/env`
	 * The import below will work out-of-the-box in a SvelteKit setup.
	 */
	import { browser } from "$app/env"

	const c_name = get_comp_name_int(get_current_component())
	const verbose: boolean = verbose_mode()

	export let log_dev: { [P in keyof LogDEV]: LogDEV[P] } = undefined
	//export let log_rs: boolean = false
	export let log_lc: { [P in keyof LogLC]: LogLC[P] } = undefined

	export let interactionEnabled: boolean
	export let parent: SvelteComponentDev
	export let sti: number = getContext("store_index")
	export let obj: Object3D

	// TODO  still not sure if we even need this / want to handle this like svelte
	//const passive_events = new Set([])

	export let modifiers: SvelthreeModifiersProp = undefined
	const user_modifiers_prop = new Map<SvelthreeSupportedInteractionEvent | "all", Set<SvelthreeSupportedModifier>>()
	const user_modifiers_action = new Map<SvelthreeSupportedInteractionEvent, Set<SvelthreeSupportedModifier>>()
	type UserModifiersMap = typeof user_modifiers_prop | typeof user_modifiers_action

	// modifiers set by the `modifiers` prop
	$: if (modifiers) {
		for (const event_name_or_all in modifiers) {
			const modifiers_arr: SvelthreeSupportedModifier[] = modifiers[event_name_or_all]
			const valid_modifiers: Set<SvelthreeSupportedModifier> = get_valid_modifiers_only(modifiers_arr)

			user_modifiers_prop.set(event_name_or_all as SvelthreeSupportedInteractionEvent | "all", valid_modifiers)
		}
	}

	/** Filter out / use only supported modifiers. */
	function get_valid_modifiers_only(modifiers_arr: string[]): Set<SvelthreeSupportedModifier> {
		const valid_modifiers: SvelthreeSupportedModifier[] = []

		for (let i = 0; i < modifiers_arr.length; i++) {
			const modifier_name: string = modifiers_arr[i]
			if (!SUPPORTED_MODIFIERS_SET.has(modifier_name as SvelthreeSupportedModifier)) {
				console.error(`SvelthreeInteraction > ERROR: modifier '${modifier_name}'`)
			} else if (!valid_modifiers.includes(modifier_name as SvelthreeSupportedModifier)) {
				valid_modifiers.push(modifier_name as SvelthreeSupportedModifier)
			}
		}

		return new Set(valid_modifiers)
	}

	let raycaster: Raycaster
	$: raycaster = $svelthreeStores[sti].raycaster

	export let dispatch: (type: string, detail?: any) => void

	const pointer: PointerState = getContext("pointer")

	const all_intersections: { result: any[] } = getContext("all_intersections")

	interface RaycasterData {
		/** `intersections` are of the same form as those returned by [`.intersectObject`](https://threejs.org/docs/#api/en/core/Raycaster.intersectObject). */
		intersection: { [P in keyof THREE.Intersection]: THREE.Intersection[P] }
		/** Current `Raycaster` `.ray`, e.g. useful properties: `ray.origin: Vector3` | `ray.direction: Vector3`. */
		ray: THREE.Ray
		/** The `Camera` used for raycasting. */
		camera: THREE.Camera
		/** Current pointer position ( _'point' / Vector3 position_ ) in 3d world space. */
		unprojected_point: THREE.Vector3
	}

	let raycaster_data: RaycasterData

	function intersects(): boolean {
		if (all_intersections) {
			if (all_intersections.result.length && all_intersections.result[0].object === obj) {
				raycaster_data = {
					intersection: all_intersections.result[0],
					ray: raycaster.ray,
					camera: raycaster.camera,
					unprojected_point: new Vector3(pointer.pos.x, pointer.pos.y, 0).unproject(raycaster.camera)
				}

				return true
			} else {
				return false
			}
		} else {
			return false
		}
	}

	const canvas_dom: Writable<{ element: HTMLCanvasElement }> = getContext("canvas_dom")
	const pointer_over_canvas: Writable<{ status: boolean }> = getContext("pointer_over_canvas")
	const canvas_component = $svelthreeStores[sti].canvas.svelthreeComponent

	const pointer_events_queue = []
	const keyboard_events_queue = []
	const focus_events_queue = []

	let c: HTMLElement
	$: c = $canvas_dom.element

	export let shadow_dom_el: SvelthreeShadowDOMElement = undefined

	let listeners: boolean = false

	// --- Reactively add listeners ---

	$: if (c && shadow_dom_el && raycaster && interactionEnabled && obj && !obj.userData.interact) {
		obj.userData.interact = true
		listeners = true
	}

	// --- Pointer over / out of `<canvas>` element state ---

	let out_of_canvas_triggered: boolean = false

	// pointer is out of / exited the `<canvas>` element.
	$: if (obj.userData.interact && pointer.event && $pointer_over_canvas.status === false) {
		if (!out_of_canvas_triggered) {
			out_of_canvas_triggered = true

			// dispatch `pointerout` if the last object pointer was over before
			// exiting the canvas, was an interactive and a non-blocking one.
			if (!obj.userData.block) {
				check_pointer_overout(pointer.event)
			}
		}
	}

	// pointer is over / entered the `<canvas>` element.
	$: if (obj.userData.interact && $pointer_over_canvas.status === true) {
		if (out_of_canvas_triggered) {
			out_of_canvas_triggered = false
		}
	}

	//  RENDER EVENT interaction_2  ALWAYS  ->  IMPORTANT  In mode `always` ALL component / shadow dom EVENTS are queued!

	/** [ _mode `always` only_ ] Removes `interaction_2` render event listener. */
	let remove_interaction_2_listener: () => void

	/**
	 * [ _mode `always` only_ ] Adds `interaction_2` render event listener -> `on_interaction_2()` handler will
	 * execute all / any queued events ( _raf aligned_ ) and trigger `pointerover` / `pointerout` events -> even
	 * if the pointer is not moving.
	 */
	function add_interaction_2_listener(): void {
		remove_interaction_2_listener = $svelthreeStores[sti].rendererComponent.$on("interaction_2", on_interaction_2)
	}

	/**
	 * [ _mode `always` only_ ]
	 * - executes all / any queued pointer events ( _raf aligned_ ) on each rendered frame.
	 * - triggers `pointerover` / `pointerout` events -> even if the pointer is not moving.
	 */
	function on_interaction_2(): void {
		// `pointer.event` is the last `pointermove` event detected / saved by the `Canvas` component
		if (pointer.event) {
			interaction2_check_pointer_overout(pointer.event)
			interaction2_check_pointer_move_moveover(pointer.event)
		}

		interaction2_execute_queued_pointer_events()
	}

	/**
	 * [ _mode `always` only_ ]
	 * Triggers `pointerover` / `pointerout` events -> even if the pointer is not moving, e.g. if the pointer
	 * is over the `<canvas>` element an some interactive object intersects ( _animated_ ) the pointer
	 * during animation rendering ( _raf_ ).
	 *
	 * `e` ( _`pointer.event`_ ) is the last `pointermove` event detected / saved by the `Canvas` component.
	 */
	function interaction2_check_pointer_overout(e: PointerEvent): void {
		check_pointer_overout(e)
	}

	/**
	 * [ _mode `always` only_ ]
	 * Triggers `pointermove` / `pointermoveover` events.
	 *
	 * `e` ( _`pointer.event`_ ) is the last `pointermove` event detected / saved by the `Canvas` component.
	 */
	function interaction2_check_pointer_move_moveover(e: PointerEvent) {
		check_pointer_moveover(e)
	}

	/** [ _mode `always` only_ ] Executes any queue `pointer` related events. */
	function interaction2_execute_queued_pointer_events(): void {
		// there'll always be only one (last) pointer move event
		if (queued_pointer_move_events.length) {
			queued_pointer_move_events[0]()
			queued_pointer_move_events.length = 0
		}

		// there'll always be only one (last) pointer moveover event
		if (queued_pointer_moveover_events.length) {
			queued_pointer_moveover_events[0]()
			queued_pointer_moveover_events.length = 0
		}

		if (pointer_events_queue.length) {
			for (let i = 0; i < pointer_events_queue.length; i++) {
				pointer_events_queue[i]()
			}
			pointer_events_queue.length = 0
		}
	}

	/** [ _mode `always` only_ ] Removes `interaction_3` render event listener. */
	let remove_interaction_3_listener: () => void

	/**
	 * [ _mode `always` only_ ] Adds `interaction_3` render event listener -> `on_interaction_3()` handler will
	 * execute all / any queued focus / keyboard events ( _raf aligned_ ) and trigger `pointerover` / `pointerout` events -> even
	 * if the pointer is not moving.
	 */
	function add_interaction_3_listener(): void {
		remove_interaction_3_listener = $svelthreeStores[sti].rendererComponent.$on("interaction_3", on_interaction_3)
	}

	/**
	 * [ _mode `always` only_ ]
	 * - executes all / any queued pointer events ( _raf aligned_ ) on each rendered frame.
	 * - triggers `pointerover` / `pointerout` events -> even if the pointer is not moving.
	 */
	function on_interaction_3(): void {
		interaction3_execute_queued_focus_events()
		interaction3_execute_queued_keyboard_events()
	}

	/** [ _mode `always` only_ ] Executes any queue `focus` related events. */
	function interaction3_execute_queued_focus_events(): void {
		if (focus_events_queue.length) {
			for (let i = 0; i < focus_events_queue.length; i++) {
				focus_events_queue[i]()
			}
			focus_events_queue.length = 0
		}
	}

	/** [ _mode `always` only_ ] Executes any queue `keyboard` related events. */
	function interaction3_execute_queued_keyboard_events(): void {
		if (keyboard_events_queue.length) {
			for (let i = 0; i < keyboard_events_queue.length; i++) {
				keyboard_events_queue[i]()
			}
			keyboard_events_queue.length = 0
		}
	}

	// LISTENER MANAGEMENT //

	const used_pointer_events_directive = new Set<string>([])
	const used_pointer_events_action = new Set<string>([])
	let used_pointer_events = new Set<string>([])

	const used_keyboard_events_directive = new Set<string>([])
	const used_keyboard_events_action = new Set<string>([])
	let used_keyboard_events = new Set<string>([])

	const used_focus_events_directive = new Set<string>([])
	const used_focus_events_action = new Set<string>([])
	let used_focus_events = new Set<string>([])

	type HandlerSetBy = "on_directive" | "prop_action"

	/** If the callbacks array of a certain directive (e.g. `on:click`) is emtpy or all callbacks are nullish, the corresponding event listener (e.g. "click") will be removed. */
	function has_on_directive(on_directive: string): boolean {
		const has_directive_key: boolean = Object.keys(parent.$$.callbacks).includes(on_directive)
		const directive_callbacks: any[] | null = has_directive_key ? parent.$$.callbacks[on_directive] : null

		if (directive_callbacks?.length) {
			for (let i = 0; i < directive_callbacks.length; i++) {
				if (directive_callbacks[i]) {
					return true
				}
			}
			return false
		} else {
			return false
		}
	}

	// ---  LISTENER OPTIONS AND MODIFIERS  UTILS ---

	function get_listener_options_from_modifiers_prop(event_name: SvelthreeSupportedInteractionEvent): {
		[key in SupportedAddEventListenerOption]?: boolean
	} {
		const all = user_modifiers_prop.has("all") ? user_modifiers_prop.get("all") : null
		const spec = user_modifiers_prop.has(event_name) ? user_modifiers_prop.get(event_name) : null

		let mods: Set<SvelthreeSupportedModifier>
		let opts: { [key in SupportedAddEventListenerOption]?: boolean } = undefined

		if (all && spec) {
			mods = new Set([...all, ...spec])
		} else {
			mods = all || spec
		}

		if (mods) {
			mods.forEach((key) => {
				if (ADD_EVENT_LISTENER_OPTIONS_SET.has(key as SupportedAddEventListenerOption)) {
					if (!opts) opts = {}
					opts[key as SupportedAddEventListenerOption] = true
				}
			})
		}

		return opts
	}

	function get_listener_options_from_modifiers_arr(
		event_name: SvelthreeSupportedInteractionEvent,
		modifiers_arr: string[]
	): { [key in SupportedAddEventListenerOption]?: boolean } {
		if (user_modifiers_prop.has(event_name) || user_modifiers_prop.has("all")) {
			const all = user_modifiers_prop.has("all") ? user_modifiers_prop.get("all") : null
			const spec = user_modifiers_prop.has(event_name) ? user_modifiers_prop.get(event_name) : null
			const user = get_valid_modifiers_only(modifiers_arr)

			let mods: Set<SvelthreeSupportedModifier>
			let opts: { [key in SupportedAddEventListenerOption]?: boolean } = undefined

			if (all && spec) {
				mods = new Set([...all, ...spec, ...user])
			} else {
				mods = all || spec
			}

			mods.forEach((key) => {
				if (ADD_EVENT_LISTENER_OPTIONS_SET.has(key as SupportedAddEventListenerOption)) {
					if (!opts) opts = {}
					opts[key] = true
				}
			})

			return opts
		} else {
			const user = get_valid_modifiers_only(modifiers_arr)
			let opts: { [key in SupportedAddEventListenerOption]?: boolean } = undefined

			user.forEach((key) => {
				if (ADD_EVENT_LISTENER_OPTIONS_SET.has(key as SupportedAddEventListenerOption)) {
					if (!opts) opts = {}
					opts[key] = true
				}
			})

			return opts
		}
	}

	function update_prop_action_modifiers(
		event_name: SvelthreeSupportedInteractionEvent,
		modifiers_arr: string[]
	): void {
		const all = user_modifiers_prop.has("all") ? user_modifiers_prop.get("all") : null
		const spec = user_modifiers_prop.has(event_name) ? user_modifiers_prop.get(event_name) : null
		const user = modifiers_arr ? get_valid_modifiers_only(modifiers_arr) : null

		let mods: Set<SvelthreeSupportedModifier>

		if (all && spec) {
			if (user) {
				mods = new Set([...all, ...spec, ...user])
			} else {
				mods = new Set([...all, ...spec])
			}
		} else {
			if (all) {
				if (user) {
					mods = new Set([...all, ...user])
				} else {
					mods = new Set([...all])
				}
			} else if (spec) {
				if (user) {
					mods = new Set([...spec, ...user])
				} else {
					mods = new Set([...spec])
				}
			} else if (!all && !spec) {
				if (user) mods = new Set([...user])
			}
		}

		if (mods) user_modifiers_action.set(event_name, mods)
	}

	// ---  LISTENER MANAGEMENT  UTILS ---

	function has_prop_action(prop_action: string): boolean {
		return !!parent[prop_action]
	}

	function using_event(event_name: SvelthreeSupportedInteractionEvent): boolean {
		return has_on_directive(event_name) || parent[`on_${event_name}`]
	}

	function not_using_event(event_name: SvelthreeSupportedInteractionEvent): boolean {
		return !has_on_directive(event_name) && !parent[`on_${event_name}`]
	}

	function prop_action_is_simple(event_name: SvelthreeSupportedInteractionEvent): boolean {
		return typeof parent[`on_${event_name}`] === "function"
	}

	function prop_action_is_complex(event_name: SvelthreeSupportedInteractionEvent): boolean {
		return parent[`on_${event_name}`].length && typeof parent[`on_${event_name}`][0] === "function"
	}

	function get_prop_action_modifiers(event_name: SvelthreeSupportedInteractionEvent): string[] | null {
		return parent[`on_${event_name}`].length > 1 ? parent[`on_${event_name}`][1] : null
	}

	//  POINTER Event  CANVAS Component POINTER Event -> SHADOW DOM Event  -->  SHADOW DOM Event LISTENER -> SHADOW DOM Event HANDLER  -->  DISPATCH Component Event IMMEDIATELY / QUEUE  //

	// IMPORTANT  LIMITATIONS:
	// - if using directives  -> `once` should also be set as standard svelte modifier if set in modifiers-prop
	// - `modifiers` prop will affect directives and actions if these are being mixed
	// -  TODO  / CHECK e.g. `on:click` without handler (forwarding) -> https://svelte.dev/docs#template-syntax-element-directives
	// the component itself should emit the event ... isn't this already like this?
	function add_pointer_listener(event_name: SvelthreeSupportedPointerEvent, dispatch_via_shadow_dom: boolean): void {
		// IMPORTANT  HACKY but simple: links and buttons are being handled as directives concerning modifiers etc.!
		if (has_on_directive(event_name) || parent.link || parent.button) {
			if (event_not_registered(event_name, used_pointer_events_directive)) {
				const listener_options = get_listener_options_from_modifiers_prop(event_name)

				set_pointer_listeners(event_name, listener_options, dispatch_via_shadow_dom, "on_directive")

				register_event(event_name, used_pointer_events_directive)
			} else {
				//console.warn(`'${event_name}' already registered as directive event!`)
			}
		}

		if (parent[`on_${event_name}`]) {
			if (event_not_registered(event_name, used_pointer_events_action)) {
				if (prop_action_is_simple(event_name)) {
					update_prop_action_modifiers(event_name, null)
					const listener_options = get_listener_options_from_modifiers_prop(event_name)

					set_pointer_listeners(event_name, listener_options, dispatch_via_shadow_dom, "prop_action")
				} else if (prop_action_is_complex(event_name)) {
					const modifiers_arr = get_prop_action_modifiers(event_name)
					update_prop_action_modifiers(event_name, modifiers_arr)

					const listener_options = modifiers_arr
						? get_listener_options_from_modifiers_arr(event_name, modifiers_arr)
						: null
					set_pointer_listeners(event_name, listener_options, dispatch_via_shadow_dom, "prop_action")
				} else {
					console.error(
						`SVELTHREE > SvelthreeInteraction > add_pointer_listener > Cannot process prop action for event ${event_name}, doesn't match required form.`
					)
				}

				register_event(event_name, used_pointer_events_action)
			} else {
				//console.warn(`'${event_name}' already registered as internal action event!`)
			}
		}

		// update used pointer events
		used_pointer_events = new Set([...used_pointer_events_directive, ...used_pointer_events_action])
	}

	function set_pointer_listeners(
		event_name: SvelthreeSupportedPointerEvent,
		listener_options: { [key in SupportedAddEventListenerOption]?: boolean } | undefined | null,
		dispatch_via_shadow_dom: boolean,
		set_by: HandlerSetBy
	) {
		let handler: (e: PointerEvent) => void = undefined
		if (set_by === "prop_action") handler = pointerevents_handler_action
		if (set_by === "on_directive") handler = pointerevents_handler_directive

		//  IMPORTANT  only `pointermove` event is NOT being re-dispatched via shadow dom!
		if (dispatch_via_shadow_dom) {
			add_shadow_dom_pointer_listener(event_name, listener_options, handler)
		}

		add_canvas_pointer_listener(event_name)
	}

	function add_shadow_dom_pointer_listener(
		event_name: SvelthreeSupportedInteractionEvent,
		listener_options: { [key in SupportedAddEventListenerOption]?: boolean } | undefined | null,
		handler: (e: PointerEvent) => void
	): void {
		listener_options
			? shadow_dom_el.addEventListener(event_name, handler, listener_options)
			: shadow_dom_el.addEventListener(event_name, handler)
	}

	/*  POINTER Event   CANVAS Component POINTER Event -> SHADOW DOM Event  */
	/*
        `Canvas` component emits (spreads) internal canvas ( POINTER ) events to all interactive components.
        Interactive components listen to those internal canvas ( POINTER ) events and schedule their redispatch via SHADOW DOM:
            - mode `auto`: all internal canvas ( POINTER ) events get redispatched immediatelly via SHADOW DOM ( any resulting changes will trigger a new render )
            - mode `always`: all internal canvas ( POINTER ) events get queued / will be redispatched via SHADOW DOM on the next render ( _raf_ )
    */

	/** Pointer events are being provided (re-dispatched) by the Canvas component. */
	function add_canvas_pointer_listener(event_name: SvelthreeSupportedInteractionEvent): void {
		switch (event_name) {
			case "click":
				if (!remove_canvas_click_listener) add_canvas_click_listener()
				break
			case "pointerup":
				if (!remove_canvas_pointerup_listener) add_canvas_pointerup_listener()
				break
			case "pointerdown":
				if (!add_canvas_pointerdown_listener) add_canvas_pointerdown_listener()
				break
			case "pointerout":
			case "pointerover":
				if (!remove_canvas_pointeroverout_listener) add_canvas_pointeroverout_listener()
				break
			case "pointermoveover":
				if (!remove_canvas_pointermoveover_listener) add_canvas_pointermoveover_listener()
				break
			case "pointermove":
				if (!remove_canvas_pointermove_listener) add_canvas_pointermove_listener()
				break
			default:
				console.error(`SVELTHREE > SvelthreeInteraction > Pointer event '${event_name}' not implemented!`)
				break
		}
	}

	//  POINTER Event   CANVAS Component POINTER Event -> SHADOW DOM Event  `canvas_pointermove` -> `pointermove`

	const queued_pointer_move_events = []

	let remove_canvas_pointermove_listener: () => void
	function add_canvas_pointermove_listener(): void {
		remove_canvas_pointermove_listener = canvas_component.$on("canvas_pointermove", (e: CustomEvent<any>) =>
			// check before dispatching 'pointermove' component event directly (not via shadow dom listener / handler)
			check_pointer_move(e.detail.event)
		)
	}

	const last_pointer_move = {
		clientX: undefined,
		clientY: undefined
	}

	function pointer_has_not_moved_move(e: PointerEvent): boolean {
		return last_pointer_move.clientX === e.clientX && last_pointer_move.clientY === e.clientY
	}

	function check_pointer_move(e: PointerEvent) {
		if (
			used_pointer_events.has("pointermove") &&
			$pointer_over_canvas.status === true &&
			!pointer_has_not_moved_move(e)
		) {
			// `check_pointer_move` & `check_pointer_moveover` use the same `pointerevent`
			// so we have to separate `last_pointer_...`
			last_pointer_move.clientX = e.clientX
			last_pointer_move.clientY = e.clientY

			// no check, no dispatch via shadow dom but also queue pointer move in "always" mode
			pointerevents_handler(get_pointerevent_modified_clone(e))
		}
	}

	const queued_pointer_moveover_events = []

	//  POINTER Event   CANVAS Component POINTER Event -> SHADOW DOM Event  `canvas_pointermove` -> `pointermoveover`

	let remove_canvas_pointermoveover_listener: () => void
	function add_canvas_pointermoveover_listener(): void {
		remove_canvas_pointermoveover_listener = canvas_component.$on("canvas_pointermove", (e: CustomEvent<any>) =>
			// check before dispatching 'pointermoveover' component event via shadow dom listener / handler
			check_pointer_moveover(e.detail.event)
		)
	}

	const last_pointer_moveover = {
		clientX: undefined,
		clientY: undefined
	}

	function pointer_has_not_moved_moveover(e: PointerEvent): boolean {
		return last_pointer_moveover.clientX === e.clientX && last_pointer_moveover.clientY === e.clientY
	}

	/**
	 * - mode `always`: `e` ( _`pointer.event`_ ) is the last `pointermove` event detected / saved by the `Canvas` component.
	 * - mode `auto`: `e` ( _`e.detail.event`_ ) is the `pointervent` passed as detail of the `canvas_pointermove` event dispatched by the `Canvas` component.
	 */
	function check_pointer_moveover(e: PointerEvent) {
		//  IMPORTANT  -> `pointermoveover` is not a standard DOM event, so it will not bubble up back to the `<canvas>` element!
		if ($pointer_over_canvas.status === true) {
			if (intersects() && used_pointer_events.has("pointermoveover") && !pointer_has_not_moved_moveover(e)) {
				// `check_pointer_move` & `check_pointer_moveover` use the same `pointerevent` so we have to separate `last_pointer_...`
				last_pointer_moveover.clientX = e.clientX
				last_pointer_moveover.clientY = e.clientY

				// immediatelly dispatch component event via shadow dom listener / handler
				shadow_dom_el.dispatchEvent(get_pointerevent_modified_clone(e, "pointermoveover"))
			}
		}
	}

	//  POINTER Event   CANVAS Component POINTER Event -> SHADOW DOM Event  `canvas_pointermove` -> `pointerover` / `pointerout`

	let remove_canvas_pointeroverout_listener: () => void
	function add_canvas_pointeroverout_listener(): void {
		remove_canvas_pointeroverout_listener = canvas_component.$on(
			"canvas_pointermove",
			(e: { detail: { event: PointerEvent } }) =>
				// check before dispatching 'pointerover' or 'pointerout' component event via shadow dom listener / handler
				check_pointer_overout(e.detail.event)
		)
	}

	let pointer_is_over = false
	let pointer_is_out = true

	/**
	 * - mode `always`: `e` ( _`pointer.event`_ ) is the last `pointermove` event detected / saved by the `Canvas` component.
	 * - mode `auto`: `e` ( _`e.detail.event`_ ) is the `pointervent` passed as detail of the `canvas_pointermove` event dispatched by the `Canvas` component.
	 */
	function check_pointer_overout(e: PointerEvent) {
		if (intersects()) {
			if (!pointer_is_over) {
				pointer_is_over = true
				pointer_is_out = false

				if (used_pointer_events.has("pointerover")) {
					shadow_dom_el.dispatchEvent(get_pointerevent_modified_clone(e, "pointerover"))
				}
			}
		} else {
			if (!pointer_is_out) {
				pointer_is_out = true
				pointer_is_over = false

				if (used_pointer_events.has("pointerout")) {
					shadow_dom_el.dispatchEvent(get_pointerevent_modified_clone(e, "pointerout"))
				}
			}
		}
	}

	//  POINTER Event   CANVAS Component POINTER Event -> SHADOW DOM Event  `canvas_pointerdown` -> `pointerdown`

	let remove_canvas_pointerdown_listener: () => void
	function add_canvas_pointerdown_listener(): void {
		remove_canvas_pointerdown_listener = canvas_component.$on(
			"canvas_pointerdown",
			(e: { detail: { event: PointerEvent } }) => check_pointer_pointerdown(e.detail.event)
		)
	}

	function check_pointer_pointerdown(e: PointerEvent) {
		if (intersects()) {
			shadow_dom_el.dispatchEvent(get_pointerevent_modified_clone(e))
		}
	}

	//  POINTER Event   CANVAS Component POINTER Event -> SHADOW DOM Event  `canvas_pointerup` -> `pointerup`

	let remove_canvas_pointerup_listener: () => void
	function add_canvas_pointerup_listener(): void {
		remove_canvas_pointerup_listener = canvas_component.$on(
			"canvas_pointerup",
			(e: { detail: { event: PointerEvent } }) => check_pointer_pointerup(e.detail.event)
		)
	}

	function check_pointer_pointerup(e: PointerEvent) {
		if (intersects()) {
			shadow_dom_el.dispatchEvent(get_pointerevent_modified_clone(e))
		}
	}

	//  POINTER Event   CANVAS Component POINTER Event -> SHADOW DOM Event  `canvas_click` -> `click`

	let remove_canvas_click_listener: () => void
	function add_canvas_click_listener(): void {
		remove_canvas_click_listener = canvas_component.$on("canvas_click", (e: { detail: { event: PointerEvent } }) =>
			check_pointer_click(e.detail.event)
		)
	}

	/**
	 * - mode `always`: `e` ( _`pointer.event`_ ) is the last `pointermove` event detected / saved by the `Canvas` component.
	 * - mode `auto`: `e` ( _`e.detail.event`_ ) is the `pointervent` passed as detail of the `canvas_pointermove` event dispatched by the `Canvas` component.
	 */
	function check_pointer_click(e: PointerEvent) {
		if (intersects()) {
			shadow_dom_el.dispatchEvent(get_pointerevent_modified_clone(e))
		}
	}

	/**
	 *  POINTER Event  ONLY
	 *
	 * Clone original pointer events and re-type them if needed,in order to re-dispatch them via shadow dom.
	 * - 'click' -> get's cloned as it is.
	 * - 'pointerover' and 'pointerout' -> 'pointermove' event gets re-typed to 'pointerover' or 'pointerout'.
	 *
	 * We need to do this, because we cannot re-dispatch the same pointer event that occured on the <canvas>  \
	 * element through some other DOM / shadow DOM element.
	 *
	 */
	function get_pointerevent_modified_clone(e: PointerEvent, new_type: string = null): PointerEvent {
		const event_init: any = {}

		// we do this because simply spreading the event object -> `{...e}`:
		// "The spread operator only copies an object's own enumerable properties, not properties found higher on the prototype chain."
		// also we cannot simply alter the value of `composed` via the event object like e.g. `e.composed = false`
		for (const key in e) {
			if (key !== "path") {
				event_init[key] = e[key]
			}
		}

		//  IMPORTANT  Setting `composed` to false:
		// prevents propagation of the event (dispatched via a shadow element) to outer light dom.
		// see: https://developer.mozilla.org/en-US/docs/Web/API/Event/composed
		event_init.composed = false

		const cloned_and_modified_event: PointerEvent = new_type
			? new PointerEvent(new_type, event_init)
			: new PointerEvent(e.type, event_init)
		return cloned_and_modified_event
	}

	/*  POINTER Event   DISPATCH Component Event IMMEDIATELY / QUEUE  */

	function pointerevents_handler_action(e: PointerEvent): void {
		pointerevents_handler(e, cancel_or_stop_propagation_action)
	}

	function pointerevents_handler_directive(e: PointerEvent): void {
		pointerevents_handler(e, cancel_or_stop_propagation_directive)
	}

	function pointerevents_handler(
		e: PointerEvent,
		cancel_or_stop_propagation_fn: (e: PointerEvent | FocusEvent | KeyboardEvent) => void = null
	): void {
		const render_mode = $svelthreeStores[sti].rendererComponent.mode

		// TODO  `gotpointercapture`, `lostpointercapture` & `pointercancel` events usage needs to be explored!

		switch (render_mode) {
			case "always":
				// QUEUED EVENT DISPATCHING: dispatch our custom event / execute handler on next render (raf aligned)

				if (cancel_or_stop_propagation_fn) cancel_or_stop_propagation_fn(e)

				switch (e.type) {
					case "pointermove":
						const queued_pointermove_event = () => dispatch_pointerevent_intersection_indep(e)
						queued_pointer_move_events[0] = queued_pointermove_event
						//queued_pointer_move_events[0] = () => dispatch_pointerevent_intersection_indep(e)
						break
					case "pointermoveover":
						const queued_pointermoveover_event = () => dispatch_pointerevent_intersection_indep(e)
						queued_pointer_moveover_events[0] = queued_pointermoveover_event
						//queued_pointer_moveover_events[0] = () => dispatch_pointerevent_intersection_indep(e)
						break
					default:
						const queued_pointer_event = () => dispatch_pointerevent_intersection_dep(e)
						pointer_events_queue.push(queued_pointer_event)
						//pointer_events_queue.push(() => dispatch_pointerevent_intersection_dep(e))
						break
				}

				break
			case "auto":
				// IMMEDIATE EVENT DISPATCHING (not raf aligned) / any changes will schedule a new render (raf aligned)

				cancel_or_stop_propagation_fn(e)

				if (e.type === "pointermove") {
					dispatch_pointerevent_intersection_indep(e)
				} else {
					dispatch_pointerevent_intersection_dep(e)
				}

				break
			default:
				console.error(`SvelthreeInteraction > pointerevents_handler > no such 'render_mode' -> ${render_mode}!`)
				break
		}
	}

	/** intersection dependent -> has raycaster_data! */
	function dispatch_pointerevent_intersection_dep(e: PointerEvent) {
		const action_name: string = `on_${e.type}`

		const detail = {
			e,
			obj,
			comp: parent,
			raycaster_data
		}

		if (has_on_directive(e.type)) dispatch(e.type, detail)
		if (has_prop_action(action_name)) dispatch_prop_action(action_name, e.type, detail)
	}

	/** intersection independent -> no raycaster_data! */
	function dispatch_pointerevent_intersection_indep(e: PointerEvent) {
		const action_name: string = `on_${e.type}`

		const detail = {
			e,
			obj,
			comp: parent
		}

		if (has_on_directive(e.type)) dispatch(e.type, detail)
		if (has_prop_action(action_name)) dispatch_prop_action(action_name, e.type, detail)
	}

	/*  FOCUS Event   NATIVE DOM / SHADOW DOM Event  -->  SHADOW DOM Event LISTENER -> SHADOW DOM Event HANDLER  -->  DISPATCH Component Event IMMEDIATELY / QUEUE  */

	/*  FOCUS Event   SHADOW DOM Event LISTENER -> SHADOW DOM Event HANDLER  */

	function add_focus_listener(event_name: SvelthreeSupportedFocusEvent): void {
		if (has_on_directive(event_name)) {
			if (event_not_registered(event_name, used_focus_events_directive)) {
				const listener_options = get_listener_options_from_modifiers_prop(event_name)

				set_focus_listener(event_name, listener_options, "on_directive")
				register_event(event_name, used_focus_events_directive)
			} else {
				//console.warn(`'${event_name}' already registered as directive event!`)
			}
		}

		if (parent[`on_${event_name}`]) {
			if (event_not_registered(event_name, used_focus_events_action)) {
				if (prop_action_is_simple(event_name)) {
					update_prop_action_modifiers(event_name, null)
					const listener_options = get_listener_options_from_modifiers_prop(event_name)

					set_focus_listener(event_name, listener_options, "prop_action")
				} else if (prop_action_is_complex(event_name)) {
					const modifiers_arr = get_prop_action_modifiers(event_name)
					update_prop_action_modifiers(event_name, modifiers_arr)

					const listener_options = modifiers_arr
						? get_listener_options_from_modifiers_arr(event_name, modifiers_arr)
						: null

					set_focus_listener(event_name, listener_options, "prop_action")
				} else {
					console.error(
						`SVELTHREE > SvelthreeInteraction > add_focus_listener > Cannot process prop action for event ${event_name}, doesn't match required form.`
					)
				}

				register_event(event_name, used_focus_events_action)
			} else {
				//console.warn(`'${event_name}' already registered as internal action event!`)
			}
		}

		// update used focus events
		used_focus_events = new Set([...used_focus_events_directive, ...used_focus_events_action])
	}

	function set_focus_listener(
		event_name: SvelthreeSupportedFocusEvent,
		listener_options: { [key in SupportedAddEventListenerOption]?: boolean } | undefined | null,
		set_by: HandlerSetBy
	) {
		let handler: (e: FocusEvent) => void = undefined
		if (set_by === "prop_action") handler = focusevents_handler_action
		if (set_by === "on_directive") handler = focusevents_handler_directive

		add_shadow_dom_focus_listeners(event_name, listener_options, handler)
	}

	function add_shadow_dom_focus_listeners(
		event_name: SvelthreeSupportedInteractionEvent,
		listener_options: { [key in SupportedAddEventListenerOption]?: boolean } | undefined | null,
		handler: (e: FocusEvent) => void
	): void {
		listener_options
			? shadow_dom_el.addEventListener(event_name, handler, listener_options)
			: shadow_dom_el.addEventListener(event_name, handler)
	}

	/*  FOCUS Event   DISPATCH Component Event IMMEDIATELY / QUEUE  */

	function focusevents_handler_action(e: FocusEvent): void {
		focusevents_handler(e, cancel_or_stop_propagation_action)
	}

	function focusevents_handler_directive(e: FocusEvent): void {
		focusevents_handler(e, cancel_or_stop_propagation_directive)
	}

	function focusevents_handler(
		e: FocusEvent,
		cancel_or_stop_propagation_fn: (e: PointerEvent | FocusEvent | KeyboardEvent) => void
	): void {
		const render_mode = $svelthreeStores[sti].rendererComponent.mode

		cancel_or_stop_propagation_fn(e)

		switch (render_mode) {
			case "always":
				// QUEUED EVENT DISPATCHING: dispatch our custom event / execute handler on next render (raf aligned)
				const queued_focus_event = () => dispatch_focusevent_intersection_indep(e)
				focus_events_queue.push(queued_focus_event)
				break
			case "auto":
				// IMMEDIATE EVENT DISPATCHING (not raf aligned) / any changes will schedule a new render (raf aligned)
				dispatch_focusevent_intersection_indep(e)
				break
			default:
				console.error(`SvelthreeInteraction > focusevents_handler > no such 'render_mode' -> ${render_mode}!`)
				break
		}
	}

	function dispatch_focusevent_intersection_indep(e: FocusEvent) {
		const action_name: string = `on_${e.type}`

		const detail = {
			e,
			obj,
			comp: parent
		}

		// intersection independent -> no raycaster_data!
		if (has_on_directive(e.type)) dispatch(e.type, detail)
		if (has_prop_action(action_name)) dispatch_prop_action(action_name, e.type, detail)
	}

	/*  KEYBOARD Event   NATIVE DOM / SHADOW DOM Event  -->  SHADOW DOM Event LISTENER -> SHADOW DOM Event HANDLER  -->  DISPATCH Component Event IMMEDIATELY / QUEUE  */

	/*  KEYBOARD Event   GLOBAL Keyboard Event -> CANVAS Component Keyboard Event  -->  DISPATCH Component Event IMMEDIATELY / QUEUE  */

	/*  KEYBOARD Event   SHADOW DOM Event LISTENER -> SHADOW DOM Event HANDLER  */

	function add_keyboard_listener(event_name: SvelthreeSupportedKeyboardEvent): void {
		if (has_on_directive(event_name)) {
			if (event_not_registered(event_name, used_keyboard_events_directive)) {
				const listener_options = get_listener_options_from_modifiers_prop(event_name)

				set_keyboard_listener(event_name, listener_options, "on_directive")

				register_event(event_name, used_keyboard_events_directive)
			} else {
				//console.warn(`'${event_name}' already registered as directive event!`)
			}
		}

		if (parent[`on_${event_name}`]) {
			if (event_not_registered(event_name, used_keyboard_events_action)) {
				if (prop_action_is_simple(event_name)) {
					update_prop_action_modifiers(event_name, null)
					const listener_options = get_listener_options_from_modifiers_prop(event_name)

					set_keyboard_listener(event_name, listener_options, "prop_action")
				} else if (prop_action_is_complex(event_name)) {
					const modifiers_arr = get_prop_action_modifiers(event_name)
					update_prop_action_modifiers(event_name, modifiers_arr)

					const listener_options = modifiers_arr
						? get_listener_options_from_modifiers_arr(event_name, modifiers_arr)
						: null
					set_keyboard_listener(event_name, listener_options, "prop_action")
				} else {
					console.error(
						`SVELTHREE > SvelthreeInteraction > add_keyboard_listener > Cannot process prop action for event ${event_name}, doesn't match required form.`
					)
				}

				register_event(event_name, used_keyboard_events_action)
			} else {
				//console.warn(`'${event_name}' already registered as internal action event!`)
			}
		}

		// update used keyboard events
		used_keyboard_events = new Set([...used_keyboard_events_directive, ...used_keyboard_events_action])
	}

	function set_keyboard_listener(
		event_name: SvelthreeSupportedKeyboardEvent,
		listener_options: { [key in SupportedAddEventListenerOption]?: boolean } | undefined | null,
		set_by: HandlerSetBy
	) {
		let modifiers_map: UserModifiersMap

		if (set_by === "prop_action") {
			modifiers_map = user_modifiers_action
		} else if (set_by === "on_directive") {
			modifiers_map = user_modifiers_prop
		}

		if (modifiers_map.get(event_name)?.has("self")) {
			// listener is added directly to shadow dom.
			// The shadow dom element has to have focus in order to react to keyboard input.
			//  IMPORTANT  MODIFIERS possible! e.g. `preventDefault` modifier will have 'local' effect.
			let handler: (e: KeyboardEvent) => void = undefined
			if (set_by === "prop_action") handler = keyboardevents_handler_action
			if (set_by === "on_directive") handler = keyboardevents_handler_directive

			add_shadow_dom_keyboard_listener(event_name, listener_options, handler)
		} else {
			// <canvas> element is listening (listener attached to `window` or `document`) and spreading Keyboard events to all interactive
			// components via an internal event, e.g. `canvas_keydown`, just like pointer events.
			//  IMPORTANT  NO MODIFIERS possible, e.g. `preventDefault()` has to be called from inside some user defined global handler.
			add_canvas_keyboard_listener(event_name, set_by)
		}
	}

	function add_shadow_dom_keyboard_listener(
		event_name: SvelthreeSupportedInteractionEvent,
		listener_options: { [key in SupportedAddEventListenerOption]?: boolean } | undefined | null,
		handler: (e: KeyboardEvent) => void
	): void {
		listener_options
			? shadow_dom_el.addEventListener(event_name, handler, listener_options)
			: shadow_dom_el.addEventListener(event_name, handler)
	}

	/** Keyboard events are also being provided (re-dispatched) by the Canvas component. */
	function add_canvas_keyboard_listener(event_name: SvelthreeSupportedInteractionEvent, set_by: HandlerSetBy): void {
		switch (event_name) {
			case "keydown":
				if (set_by === "prop_action" && !remove_canvas_keydown_listener_action)
					add_canvas_keydown_listener_action()
				if (set_by === "on_directive" && !remove_canvas_keydown_listener_directive)
					add_canvas_keydown_listener_directive()
				break
			case "keyup":
				if (set_by === "prop_action" && !remove_canvas_keyup_listener_action) add_canvas_keyup_listener_action()
				if (set_by === "on_directive" && !remove_canvas_keyup_listener_directive)
					add_canvas_keyup_listener_directive()
				break
			case "keypress":
				if (set_by === "prop_action" && !remove_canvas_keypress_listener_action)
					add_canvas_keypress_listener_action()
				if (set_by === "on_directive" && !remove_canvas_keypress_listener_directive)
					add_canvas_keypress_listener_directive()
				break
			default:
				console.error(`SVELTHREE > SvelthreeInteraction > Keyboard event '${event_name}' not implemented!`)
				break
		}
	}

	//  KEYBOARD Event   GLOBAL Keyboard Event -> CANVAS Component Keyboard Event  `canvas_keydown` -> `keydown`

	let remove_canvas_keydown_listener_action: () => void
	function add_canvas_keydown_listener_action(): void {
		remove_canvas_keydown_listener_action = canvas_component.$on("canvas_keydown", (e: CustomEvent<any>) =>
			// global keyboard listener -> we cancel nothing! so we can use the standard handler directly!
			keyboardevents_handler(e.detail.event, null)
		)
	}

	let remove_canvas_keydown_listener_directive: () => void
	function add_canvas_keydown_listener_directive(): void {
		remove_canvas_keydown_listener_directive = canvas_component.$on("canvas_keydown", (e: CustomEvent<any>) =>
			// global keyboard listener -> we cancel nothing! so we can use the standard handler directly!
			keyboardevents_handler(e.detail.event, null)
		)
	}

	//  KEYBOARD Event   GLOBAL Keyboard Event -> CANVAS Component Keyboard Event  `canvas_keyup` -> `keyup`

	let remove_canvas_keyup_listener_action: () => void
	function add_canvas_keyup_listener_action(): void {
		remove_canvas_keyup_listener_action = canvas_component.$on("canvas_keyup", (e: CustomEvent<any>) =>
			// global keyboard listener -> we cancel nothing! so we can use the standard handler directly!
			keyboardevents_handler(e.detail.event, null)
		)
	}

	let remove_canvas_keyup_listener_directive: () => void
	function add_canvas_keyup_listener_directive(): void {
		remove_canvas_keyup_listener_directive = canvas_component.$on("canvas_keyup", (e: CustomEvent<any>) =>
			// global keyboard listener -> we cancel nothing! so we can use the standard handler directly!
			keyboardevents_handler(e.detail.event, null)
		)
	}

	//  KEYBOARD Event   GLOBAL Keyboard Event -> CANVAS Component Keyboard Event  `canvas_press` -> `keypress`

	let remove_canvas_keypress_listener_action: () => void
	function add_canvas_keypress_listener_action(): void {
		remove_canvas_keypress_listener_action = canvas_component.$on("canvas_keypress", (e: CustomEvent<any>) =>
			keyboardevents_handler(e.detail.event, null)
		)
	}

	let remove_canvas_keypress_listener_directive: () => void
	function add_canvas_keypress_listener_directive(): void {
		remove_canvas_keypress_listener_directive = canvas_component.$on("canvas_keypress", (e: CustomEvent<any>) =>
			keyboardevents_handler(e.detail.event, null)
		)
	}

	/*  KEYBOARD Event   DISPATCH Component Event IMMEDIATELY / QUEUE  */

	function keyboardevents_handler_action(e: KeyboardEvent): void {
		keyboardevents_handler(e, cancel_or_stop_propagation_action)
	}

	function keyboardevents_handler_directive(e: KeyboardEvent): void {
		keyboardevents_handler(e, cancel_or_stop_propagation_directive)
	}

	function keyboardevents_handler(
		e: KeyboardEvent,
		cancel_or_stop_propagation_fn: (e: PointerEvent | FocusEvent | KeyboardEvent) => void | null
	): void {
		const render_mode = $svelthreeStores[sti].rendererComponent.mode

		//  IMPORTANT  //
		// any specified `default_keyboard_events_handler` for the received keyboard event
		// will override any present `preventDefault` and `stopPropagation` modifier prop setting.
		if (default_keyboard_handler_specified(e.type)) {
			canvas_component.default_keyboard_events_handler[e.type](e)
		} else {
			if (cancel_or_stop_propagation_fn) cancel_or_stop_propagation_fn(e)
		}

		switch (render_mode) {
			case "always":
				// QUEUED EVENT DISPATCHING: dispatch our custom event / execute handler on next render (raf aligned)
				const queued_keyboard_event = () => dispatch_keyboardevent_intersection_indep(e)
				keyboard_events_queue.push(queued_keyboard_event)
				break
			case "auto":
				// IMMEDIATE EVENT DISPATCHING (not raf aligned) / any changes will schedule a new render (raf aligned)
				dispatch_keyboardevent_intersection_indep(e)
				break
			default:
				console.error(
					`SvelthreeInteraction > keyboardevents_handler > no such 'render_mode' -> ${render_mode}!`
				)
				break
		}
	}

	function default_keyboard_handler_specified(event_name: KeyboardEvent["type"]): boolean {
		return (
			canvas_component.default_keyboard_events_handler &&
			canvas_component.default_keyboard_events_handler[event_name]
		)
	}

	function dispatch_keyboardevent_intersection_indep(e: KeyboardEvent) {
		const action_name: string = `on_${e.type}`

		const detail = {
			code: e.code,
			e,
			obj,
			comp: parent
		}

		// intersection independent -> no raycaster_data!
		if (has_on_directive(e.type)) dispatch(e.type, detail)
		if (has_prop_action(action_name)) dispatch_prop_action(action_name, e.type, detail)
	}

	/*  CANCEL OR STOP PROPAGATION  */

	/**
	 * -  IMPORTANT :
	 * `modifiers` prop **affects both** _`on:` directives_ **and** _prop actions_,
	 * but _prop action modifiers_ **do NOT affect** the `modifiers` prop / _`on:` directives_!
	 *
	 * -  IMPORTANT  mode `"always"`:
	 *   calling `e.preventDefault()` / `e.stopPropagation()` inside a handler **will have NO effect** ☝️,
	 * because the was already emitted at some point during the animation, so `e.preventDefault()` / `e.stopPropagation()` **HAVE TO**
	 * be set via `modifiers` prop in order to cancel event's default (DOM) action or stop propagation at the exact same moment it occured.
	 *
	 * -  IMPORTANT  mode `"auto"`:
	 *   calling `e.preventDefault()` inside a handler **will have effect** ☝️, means
	 * `e.preventDefault()` / `e.stopPropagation()` **CAN** but **do NOT HAVE TO** be set via `modifiers` prop
	 * in order to cancel event's default (DOM) action or stop propagation at the exact same moment it occured.
	 */
	function cancel_or_stop_propagation_action(e: PointerEvent | FocusEvent | KeyboardEvent): void {
		const e_type = e.type as SvelthreeSupportedInteractionEvent
		if (
			user_modifiers_action.get(e_type)?.has("preventDefault") ||
			user_modifiers_prop.get("all")?.has("preventDefault") ||
			user_modifiers_prop.get(e_type)?.has("preventDefault")
		)
			prevent_default(e)
		if (
			user_modifiers_action.get(e_type)?.has("stopPropagation") ||
			user_modifiers_prop.get("all")?.has("stopPropagation") ||
			user_modifiers_prop.get(e_type)?.has("stopPropagation")
		)
			stop_propagation(e)
	}

	function cancel_or_stop_propagation_directive(e: PointerEvent | FocusEvent | KeyboardEvent): void {
		if (
			user_modifiers_prop.get("all")?.has("preventDefault") ||
			user_modifiers_prop.get(e.type as SvelthreeSupportedInteractionEvent)?.has("preventDefault")
		) {
			prevent_default(e)
		}
		if (
			user_modifiers_prop.get("all")?.has("stopPropagation") ||
			user_modifiers_prop.get(e.type as SvelthreeSupportedInteractionEvent)?.has("stopPropagation")
		) {
			stop_propagation(e)
		}
	}

	function prevent_default(e: PointerEvent | FocusEvent | KeyboardEvent) {
		if (verbose && log_dev) console.info(...c_dev(c_name, "prevent_default!"))
		e.preventDefault()
	}

	function stop_propagation(e: PointerEvent | FocusEvent | KeyboardEvent) {
		if (verbose && log_dev) console.info(...c_dev(c_name, "stop_propagation!"))
		e.stopPropagation()
	}

	/*  ADDING AND REGISTERING  */

	/** for `SvelthreeInteraction` component's reactive listener management only */
	export let update_listeners = false

	let r_added_on_init = false
	// reactive listener management checks
	$: r_add_on_init = interactionEnabled && listeners
	$: r_remove = !interactionEnabled && listeners

	// Reactively add / remove pointer listeners, works with e.g. (syntax):

	// programmatically:
	//   - add/re-add: `comp.on("click", do_on_click)`
	//   - disable/remove: `comp.onx("click", onClick)`

	// dom directive:
	//   - add: `<Mesh on:click={do_on_click} />
	//   - disable/remove: `comp.onx("click", do_on_click)` or not adding to dom in the first place

	// action prop:
	//   - add/re-add: `<Mesh on_click={[do_on_click, [_optional_ modifiers_arr]]} /> or `comp.on_click = {do_on_click}`
	//   - disable/remove: `comp.on_click = null` or not adding to dom in the first place

	// COOL!  Multiple `on:` directives WILL be triggered as expected.

	$: if ((r_add_on_init && !r_added_on_init) || (update_listeners && interactionEnabled)) {
		r_added_on_init = true
		update_listeners = false

		//console.warn("UPDATE LISTENERS!")

		// --- ADD / REGISTER USED EVENTS / LISTENERS ---

		// will be queued in mode "always"
		// will be dispatsched immediately in mode "auto" -> see 'pointerevents_handler'
		if (using_event("click") || parent.button || parent.link) add_pointer_listener("click", true)
		if (using_event("pointerup")) add_pointer_listener("pointerup", true)
		if (using_event("pointerdown")) add_pointer_listener("pointerdown", true)
		//if (using_event("pointerenter")) add_pointer_listener("pointerenter") ->  DEPRECATED  same as 'pointerover'
		//if (using_event("pointerleave")) add_pointer_listener("pointerleave") ->  DEPRECATED  same as 'pointerout'

		// pointer events depending on 'pointermove' listener
		if (using_event("pointerover")) add_pointer_listener("pointerover", true)
		if (using_event("pointerout")) add_pointer_listener("pointerout", true)

		if (using_event("pointermoveover")) add_pointer_listener("pointermoveover", true)
		if (using_event("pointermove")) add_pointer_listener("pointermove", false)

		// DEPRECATED  RECONSIDER  -> do we need / want these / which use cases?
		//if (using_event("gotpointercapture")) add_pointer_listener("gotpointercapture")
		//if (using_event("lostpointercapture")) add_pointer_listener("lostpointercapture")
		//if (using_event("pointercancel")) add_pointer_listener("pointercancel")

		// keyboard events
		if (using_event("keydown")) add_keyboard_listener("keydown")
		if (using_event("keypress")) add_keyboard_listener("keypress")
		if (using_event("keyup")) add_keyboard_listener("keyup")

		// focus events
		if (using_event("focus")) add_focus_listener("focus") // doesn't bubble
		if (using_event("blur")) add_focus_listener("blur") // doesn't bubble
		if (using_event("focusin")) add_focus_listener("focusin") // bubbles
		if (using_event("focusout")) add_focus_listener("focusout") // bubbles

		// --- REMOVE / UNREGISTER UNUSED EVENTS / LISTENERS ---

		if (not_using_event("click") && !parent.button && !parent.link) completely_remove_pointer_listener("click")
		if (not_using_event("pointerup")) completely_remove_pointer_listener("pointerup")
		if (not_using_event("pointerdown")) completely_remove_pointer_listener("pointerdown")
		//if (not_using_event("pointerenter")) completely_remove_pointer_listener("pointerenter") ->  DEPRECATED  same as 'pointerover'
		//if (not_using_event("pointerleave")) completely_remove_pointer_listener("pointerleave") ->  DEPRECATED  same as 'pointerover'

		// pointer events depending on 'pointermove' listener
		if (not_using_event("pointerover")) completely_remove_pointer_listener("pointerover")
		if (not_using_event("pointerout")) completely_remove_pointer_listener("pointerout")
		if (not_using_event("pointermoveover")) completely_remove_pointer_listener("pointermoveover")

		if (not_using_event("pointermove")) completely_remove_pointer_listener("pointermove")

		// DEPRECATED  RECONSIDER  -> do we need / want these / which use cases?
		//if (not_using_event("gotpointercapture")) completely_remove_pointer_listener("gotpointercapture")
		//if (not_using_event("lostpointercapture")) completely_remove_pointer_listener("lostpointercapture")
		//if (not_using_event("pointercancel")) completely_remove_pointer_listener("pointercancel")

		// keyboard events (listener added to window)
		if (not_using_event("keydown")) completely_remove_keyboard_listener("keydown")
		if (not_using_event("keypress")) completely_remove_keyboard_listener("keypress")
		if (not_using_event("keyup")) completely_remove_keyboard_listener("keyup")

		// focus events
		if (not_using_event("focus")) completely_remove_focus_listener("focus")
		if (not_using_event("blur")) completely_remove_focus_listener("blur")
		if (not_using_event("focusin")) completely_remove_focus_listener("focusin")
		if (not_using_event("focusout")) completely_remove_focus_listener("focusout")

		set_block_status()

		if (!obj.userData.block) {
			if ($svelthreeStores[sti].rendererComponent?.mode === "always" && !remove_interaction_2_listener) {
				add_interaction_2_listener()
			}
		} else {
			if ($svelthreeStores[sti].rendererComponent?.mode === "always" && remove_interaction_2_listener) {
				remove_interaction_2_listener()
				remove_interaction_2_listener = null
			}
		}

		if ($svelthreeStores[sti].rendererComponent?.mode === "always" && !remove_interaction_3_listener) {
			add_interaction_3_listener()
		}
	}

	/**
	 * Changes component's `block` status based on pointer listeners' total count.
	 * If no pointer listeners are set, `block` will be set to `true`, means
	 * cursor will not change (_cursor changes on `interact: true` + `block: false` only_).
	 */
	function set_block_status(): void {
		//cursor will change on `interact: true` + `block: false`
		console.warn("SvelthreeInteraction > set_block_status > used_pointer_events.size:", used_pointer_events.size)
		if (used_pointer_events.size === 0) {
			// cursor will not change
			parent.block = true
			obj.userData.block = true
			console.warn("SvelthreeInteraction > set_block_status > parent.block, obj.userData.block -> true")
		} else {
			// cursor will change
			parent.block = false
			console.warn("SvelthreeInteraction > set_block_status > parent.block -> false")
			//obj.userData.block = false
		}
	}

	function register_event(event_name: SvelthreeSupportedInteractionEvent, target_set: Set<string>) {
		if (!target_set.has(event_name)) {
			target_set.add(event_name)

			// register specific events on the <canvas> element (some pointer and all keyboard events)
			switch (event_name) {
				case "click":
				case "pointerdown":
				case "pointerup":
					canvas_component.register_canvas_listener(event_name)
					break
				case "keydown":
				case "keyup":
				case "keypress":
					canvas_component.register_canvas_listener(event_name)
					break
				default:
					break
			}
		}
	}

	function event_not_registered(event_name: SvelthreeSupportedInteractionEvent, target_set: Set<string>) {
		return !target_set.has(event_name)
	}

	function event_is_registered(event_name: SvelthreeSupportedInteractionEvent, target_set: Set<string>) {
		return target_set.has(event_name)
	}

	/*  REMOVING AND UNREGISTERING  */

	/* reactively removes all listeners if interactionEnabled (interactive && interact) is false */
	$: if (r_remove) remove_all_listeners()

	export function remove_all_listeners(): void {
		// prevent `r_remove` reaction
		listeners = false

		if (remove_interaction_2_listener) {
			remove_interaction_2_listener()
			remove_interaction_2_listener = null
		}

		if (remove_interaction_3_listener) {
			remove_interaction_3_listener()
			remove_interaction_3_listener = null
		}

		remove_all_pointer_listeners()
		pointer_events_queue.length = 0

		// SVELTEKIT  SSR  keyboard event listeners are being added to `window`.
		if (browser) {
			remove_all_keyboard_listeners()
			keyboard_events_queue.length = 0
		}

		remove_all_focus_listeners()
		focus_events_queue.length = 0
	}

	function remove_all_pointer_listeners(): void {
		for (let i = 0; i < POINTER_EVENTS.length; i++) {
			completely_remove_pointer_listener(POINTER_EVENTS[i])
		}
	}

	function remove_all_keyboard_listeners(): void {
		for (let i = 0; i < KEYBOARD_EVENTS.length; i++) {
			completely_remove_keyboard_listener(KEYBOARD_EVENTS[i])
		}
	}

	function completely_remove_keyboard_listener(event_name: SvelthreeSupportedInteractionEvent): void {
		if (event_is_registered(event_name, used_keyboard_events)) {
			switch (event_name) {
				case "keydown":
					if (remove_canvas_keydown_listener_action) remove_canvas_keydown_listener_action()
					if (remove_canvas_keydown_listener_directive) remove_canvas_keydown_listener_directive()
					break
				case "keyup":
					if (remove_canvas_keyup_listener_action) remove_canvas_keyup_listener_action()
					if (remove_canvas_keyup_listener_directive) remove_canvas_keyup_listener_directive()
					break
				case "keypress":
					if (remove_canvas_keypress_listener_action) remove_canvas_keypress_listener_action()
					if (remove_canvas_keypress_listener_directive) remove_canvas_keypress_listener_directive()
					break
				default:
					console.error(
						`SVELTHREE > SvelthreeInteraction > completely_remove_keyboard_listener > Keyboard event '${event_name}' not implemented!`
					)
					break
			}

			shadow_dom_el.removeEventListener(event_name, keyboardevents_handler_action, false)
			shadow_dom_el.removeEventListener(event_name, keyboardevents_handler_action, true)
			shadow_dom_el.removeEventListener(event_name, keyboardevents_handler_directive, false)
			shadow_dom_el.removeEventListener(event_name, keyboardevents_handler_directive, true)

			unregister_keyboard_event(event_name)
		}
	}

	function unregister_keyboard_event(event_name: SvelthreeSupportedInteractionEvent) {
		delete_event_from_set(event_name, used_keyboard_events_directive)
		delete_event_from_set(event_name, used_keyboard_events_action)
		delete_event_from_set(event_name, used_keyboard_events)

		canvas_component.unregister_canvas_listener(event_name)
	}

	function remove_all_focus_listeners(): void {
		for (let i = 0; i < FOCUS_EVENTS.length; i++) {
			completely_remove_focus_listener(FOCUS_EVENTS[i])
		}
	}

	// remove unused but registered (were used) listeners
	function completely_remove_focus_listener(event_name: SvelthreeSupportedInteractionEvent): void {
		if (event_is_registered(event_name, used_focus_events)) {
			shadow_dom_el.removeEventListener(event_name, focusevents_handler_action, true)
			shadow_dom_el.removeEventListener(event_name, focusevents_handler_action, false)
			shadow_dom_el.removeEventListener(event_name, focusevents_handler_directive, true)
			shadow_dom_el.removeEventListener(event_name, focusevents_handler_directive, false)

			unregister_focus_event(event_name)
		}
	}

	function unregister_focus_event(event_name: SvelthreeSupportedInteractionEvent) {
		delete_event_from_set(event_name, used_focus_events_directive)
		delete_event_from_set(event_name, used_focus_events_action)
		delete_event_from_set(event_name, used_focus_events)
	}

	// remove unused but registered (were used) listener
	function completely_remove_pointer_listener(event_name: SvelthreeSupportedInteractionEvent): void {
		if (event_is_registered(event_name, used_pointer_events)) {
			switch (event_name) {
				case "click":
					if (remove_canvas_click_listener) remove_canvas_click_listener()
					break
				case "pointerup":
					if (remove_canvas_pointerup_listener) remove_canvas_pointerup_listener()
					break
				case "pointerdown":
					if (remove_canvas_pointerdown_listener) remove_canvas_pointerdown_listener()
					break
				case "pointerout":
				case "pointerover":
					if (remove_canvas_pointeroverout_listener) remove_canvas_pointeroverout_listener()
					break
				case "pointermoveover":
					if (remove_canvas_pointermoveover_listener) remove_canvas_pointermoveover_listener()
					break
				case "pointermove":
					if (remove_canvas_pointermove_listener) remove_canvas_pointermove_listener()
					break
				default:
					console.error(
						`SVELTHREE > SvelthreeInteraction > completely_remove_pointer_listener > Pointer event '${event_name}' not implemented!`
					)
					break
			}

			shadow_dom_el.removeEventListener(event_name, pointerevents_handler_action, false)
			shadow_dom_el.removeEventListener(event_name, pointerevents_handler_action, true)
			shadow_dom_el.removeEventListener(event_name, pointerevents_handler_directive, false)
			shadow_dom_el.removeEventListener(event_name, pointerevents_handler_directive, true)

			unregister_pointer_event(event_name)
		}
	}

	function unregister_pointer_event(event_name: SvelthreeSupportedInteractionEvent) {
		delete_event_from_set(event_name, used_pointer_events_directive)
		delete_event_from_set(event_name, used_pointer_events_action)
		delete_event_from_set(event_name, used_pointer_events)

		switch (event_name) {
			case "click":
			case "pointerdown":
			case "pointerup":
				canvas_component.unregister_canvas_listener(event_name)
				break
			default:
				break
		}
	}

	function delete_event_from_set(event_name: SvelthreeSupportedInteractionEvent, target_set: Set<string>) {
		if (target_set.has(event_name)) target_set.delete(event_name)
	}

	// disable interaction (reactive)
	$: if (c && raycaster && !interactionEnabled && obj && obj.userData.interact) {
		remove_all_listeners()
		obj.userData.interact = false
	}

	function dispatch_prop_action(action_name: string, e_type: string, detail: { [key: string]: any }) {
		const e = new CustomEvent(e_type, { detail })

		if (typeof parent[action_name] === "function") {
			parent[action_name](e)
		} else if (parent[action_name].length) {
			parent[action_name][0](e)
		} else {
			console.error(
				`SVELTHREE > SvelthreeInteraction > dispatch_prop_action : provided '${action_name}' action prop is not a valid!`
			)
		}
	}

	// ---- Lifecycle ----

	onMount(async () => {
		if (verbose && log_lc) console.info(...c_lc_int(c_name, "onMount"))
	})

	onDestroy(async () => {
		if (verbose && log_lc && (log_lc.all || log_lc.om)) console.info(...c_lc_int(c_name, "onDestroy"))
		remove_all_listeners()
	})

	beforeUpdate(async () => {
		if (verbose && log_lc && (log_lc.all || log_lc.bu)) console.info(...c_lc_int(c_name, "beforeUpdate"))
	})

	afterUpdate(async () => {
		if (verbose && log_lc && (log_lc.all || log_lc.au)) console.info(...c_lc_int(c_name, "afterUpdate"))
	})
</script>
