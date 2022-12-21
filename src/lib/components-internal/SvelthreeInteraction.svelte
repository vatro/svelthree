<!-- 
@component
This is a **svelthree** _SvelthreeInteraction_ Component.  
[ tbd ]  Link to Docs.
-->
<script lang="ts">
	import { onMount, beforeUpdate, afterUpdate, onDestroy, getContext } from "svelte"
	import type { SvelteComponentDev } from "svelte/internal"
	import { get_current_component } from "svelte/internal"
	import { Object3D, Raycaster, Vector3 } from "three"
	import { svelthreeStores } from "../stores/index.js"
	import { c_dev, c_lc_int, verbose_mode, get_comp_name } from "../utils/SvelthreeLogger.js"
	import type { LogLC, LogDEV } from "../utils/SvelthreeLogger.js"
	import type {
		PointerState,
		SvelthreeShadowDOMElement,
		RaycasterData,
		AllIntersections,
		SvelthreeInteractableComponent,
		SvelthreeInteractionEventDispatcher,
		CanvasComponentEvent,
		SvelthreeKeyboardEventDetail,
		SvelthreePointerEventDetail,
		SvelthreeFocusEventDetail,
		SvelthreeInteractionEventDetail
	} from "../types/types-extra.js"
	import type { Writable } from "svelte/store"
	import {
		KEYBOARD_EVENTS,
		FOCUS_EVENTS,
		POINTER_EVENTS,
		SUPPORTED_MODIFIERS_SET,
		ADD_EVENT_LISTENER_OPTIONS_SET
	} from "../constants/Interaction.js"
	import type {
		SvelthreeSupportedInteractionEvent,
		SupportedAddEventListenerOption,
		SvelthreeSupportedModifier,
		SvelthreeModifiersProp,
		SvelthreeSupportedKeyboardEvent,
		SvelthreeSupportedFocusEvent,
		SvelthreeSupportedPointerEvent,
		SvelthreePropActionHandler
	} from "../types/types-extra.js"

	/**
	 *  SVELTEKIT  CSR ONLY /
	 * Atm, all logic using 'document' or 'window' is wrapped in an 'if (browser)' check,
	 * and should run on CLIENT ONLY.
	 */
	const browser = !import.meta.env.SSR

	const c_name = get_comp_name(get_current_component())
	const verbose: boolean = verbose_mode()

	export let log_dev: { [P in keyof LogDEV]: LogDEV[P] } | undefined = undefined
	export let log_lc: { [P in keyof LogLC]: LogLC[P] } | undefined = undefined

	export let interactionEnabled: boolean | undefined
	export let parent: SvelthreeInteractableComponent
	export let sti: number = getContext("store_index")
	export let obj: Object3D | undefined | null

	const store = $svelthreeStores[sti]

	// TODO  still not sure if we even need this / want to handle this like svelte
	//const passive_events = new Set([])

	export let modifiers: SvelthreeModifiersProp | undefined = undefined
	const user_modifiers_prop = new Map<SvelthreeSupportedInteractionEvent | "all", Set<SvelthreeSupportedModifier>>()
	const user_modifiers_action = new Map<SvelthreeSupportedInteractionEvent, Set<SvelthreeSupportedModifier>>()
	type UserModifiersMap = typeof user_modifiers_prop | typeof user_modifiers_action

	// modifiers set by the `modifiers` prop
	$: if (modifiers) {
		for (const event_name_or_all in modifiers) {
			const modifiers_arr: SvelthreeSupportedModifier[] =
				modifiers[event_name_or_all as keyof SvelthreeModifiersProp]
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
				console.error(`SVELTHREE > ${c_name} > ERROR: modifier '${modifier_name}'`)
			} else if (!valid_modifiers.includes(modifier_name as SvelthreeSupportedModifier)) {
				valid_modifiers.push(modifier_name as SvelthreeSupportedModifier)
			}
		}

		return new Set(valid_modifiers)
	}

	let raycaster: Raycaster | undefined
	$: raycaster = store?.raycaster

	export let dispatch_interaction: SvelthreeInteractionEventDispatcher

	const pointer: PointerState = getContext("pointer")

	const all_intersections: AllIntersections = getContext("all_intersections")

	let raycaster_data: RaycasterData

	function intersects(): boolean {
		if (raycaster && all_intersections) {
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
	const canvas_component = store?.canvas.svelthreeComponent

	const pointer_events_queue: (() => void)[] = []
	const keyboard_events_queue: (() => void)[] = []
	const focus_events_queue: (() => void)[] = []

	let c: HTMLElement
	$: c = $canvas_dom.element

	export let shadow_dom_el: SvelthreeShadowDOMElement | undefined | null = undefined

	let listeners = false

	// --- Reactively add listeners ---

	$: if (c && shadow_dom_el && raycaster && interactionEnabled && obj && !obj.userData.interact) {
		obj.userData.interact = true
		listeners = true
	}

	// --- Pointer over / out of `<canvas>` element state ---

	let out_of_canvas_triggered = false

	// pointer is out of / exited the `<canvas>` element.
	$: if (obj?.userData.interact && pointer.event && $pointer_over_canvas.status === false) {
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
	$: if (obj?.userData.interact && $pointer_over_canvas.status === true) {
		if (out_of_canvas_triggered) {
			out_of_canvas_triggered = false
		}
	}

	//  RENDER EVENT interaction_2  ALWAYS  ->  IMPORTANT  In mode `always` ALL component / shadow dom EVENTS are queued!

	/** [ _mode `always` only_ ] Removes `interaction_2` render event listener. */
	let remove_interaction_2_listener: (() => void) | undefined | null

	/**
	 * [ _mode `always` only_ ] Adds `interaction_2` render event listener -> `on_interaction_2()` handler will
	 * execute all / any queued events ( _raf aligned_ ) and trigger `pointerover` / `pointerout` events -> even
	 * if the pointer is not moving.
	 */
	function add_interaction_2_listener(): void {
		remove_interaction_2_listener = store?.rendererComponent?.$on("interaction_2", on_interaction_2)
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
	 * Triggers `pointerover` / `pointerout` events -> even if the pointer is not moving, evt.g. if the pointer
	 * is over the `<canvas>` element an some interactive object intersects ( _animated_ ) the pointer
	 * during animation rendering ( _raf_ ).
	 *
	 * `e` ( _`pointer.event`_ ) is the last `pointermove` event detected / saved by the `Canvas` component.
	 */
	function interaction2_check_pointer_overout(evt: PointerEvent): void {
		check_pointer_overout(evt)
	}

	/**
	 * [ _mode `always` only_ ]
	 * Triggers `pointermove` / `pointermoveover` events.
	 *
	 * `e` ( _`pointer.event`_ ) is the last `pointermove` event detected / saved by the `Canvas` component.
	 */
	function interaction2_check_pointer_move_moveover(evt: PointerEvent) {
		check_pointer_moveover(evt)
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
	let remove_interaction_3_listener: (() => void) | undefined | null

	/**
	 * [ _mode `always` only_ ] Adds `interaction_3` render event listener -> `on_interaction_3()` handler will
	 * execute all / any queued focus / keyboard events ( _raf aligned_ ) and trigger `pointerover` / `pointerout` events -> even
	 * if the pointer is not moving.
	 */
	function add_interaction_3_listener(): void {
		remove_interaction_3_listener = store?.rendererComponent?.$on("interaction_3", on_interaction_3)
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

	/** If the callbacks array of a certain directive (evt.g. `on:click`) is emtpy or all callbacks are nullish, the corresponding event listener (evt.g. "click") will be removed. */
	function has_on_directive(on_directive: string): boolean {
		const has_directive_key: boolean = Object.keys((parent as SvelteComponentDev).$$.callbacks).includes(
			on_directive
		)
		const directive_callbacks: SvelteComponentDev["$$"]["callbacks"][] | null = has_directive_key
			? (parent as SvelteComponentDev).$$.callbacks[on_directive]
			: null

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

	function get_listener_options_from_modifiers_prop(event_name: SvelthreeSupportedInteractionEvent):
		| {
				[key in SupportedAddEventListenerOption]?: boolean
		  }
		| undefined {
		const all = user_modifiers_prop.has("all") ? user_modifiers_prop.get("all") : null
		const spec = user_modifiers_prop.has(event_name) ? user_modifiers_prop.get(event_name) : null

		let mods: Set<SvelthreeSupportedModifier> | undefined | null
		let opts: { [key in SupportedAddEventListenerOption]?: boolean } | undefined = undefined

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
	): { [key in SupportedAddEventListenerOption]?: boolean } | undefined {
		if (user_modifiers_prop.has(event_name) || user_modifiers_prop.has("all")) {
			const all = user_modifiers_prop.has("all") ? user_modifiers_prop.get("all") : null
			const spec = user_modifiers_prop.has(event_name) ? user_modifiers_prop.get(event_name) : null
			const user = get_valid_modifiers_only(modifiers_arr)

			let mods: Set<SvelthreeSupportedModifier> | undefined | null
			let opts: { [key in SupportedAddEventListenerOption]?: boolean } | undefined = undefined

			if (all && spec) {
				mods = new Set([...all, ...spec, ...user])
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
		} else {
			const user = get_valid_modifiers_only(modifiers_arr)
			let opts: { [key in SupportedAddEventListenerOption]?: boolean } | undefined = undefined

			user.forEach((key) => {
				if (ADD_EVENT_LISTENER_OPTIONS_SET.has(key as SupportedAddEventListenerOption)) {
					if (!opts) opts = {}
					opts[key as SupportedAddEventListenerOption] = true
				}
			})

			return opts
		}
	}

	function update_prop_action_modifiers(
		event_name: SvelthreeSupportedInteractionEvent,
		modifiers_arr: SvelthreeSupportedModifier[] | null
	): void {
		const all = user_modifiers_prop.has("all") ? user_modifiers_prop.get("all") : null
		const spec = user_modifiers_prop.has(event_name) ? user_modifiers_prop.get(event_name) : null
		const user = modifiers_arr ? get_valid_modifiers_only(modifiers_arr) : null

		let mods: Set<SvelthreeSupportedModifier> | undefined = undefined

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

		if (mods) {
			user_modifiers_action.set(event_name, mods)
		} else {
			// TODO  do nothing / silent?
		}
	}

	// ---  LISTENER MANAGEMENT  UTILS ---

	function has_prop_action(prop_action: string): boolean {
		const parent_state = parent.state()
		return !!parent_state[prop_action as keyof typeof parent_state]
	}

	function using_event(event_name: SvelthreeSupportedInteractionEvent): boolean {
		const parent_state = parent.state()
		return has_on_directive(event_name) || !!parent_state[`on_${event_name}`]
	}

	function not_using_event(event_name: SvelthreeSupportedInteractionEvent): boolean {
		const parent_state = parent.state()
		return !has_on_directive(event_name) && !parent_state[`on_${event_name}`]
	}

	function prop_action_is_simple(event_name: SvelthreeSupportedInteractionEvent): boolean {
		const parent_state = parent.state()
		return typeof parent_state[`on_${event_name}`] === "function"
	}

	function prop_action_is_complex(prop_action_handler: SvelthreePropActionHandler): boolean {
		return (
			!!(prop_action_handler as Array<unknown>).length &&
			!!(typeof (prop_action_handler as Array<unknown>)[0] === "function")
		)
	}

	function get_prop_action_modifiers(
		prop_action_handler: SvelthreePropActionHandler
	): SvelthreeSupportedModifier[] | null {
		return (prop_action_handler as Array<unknown>).length > 1
			? ((prop_action_handler as Array<unknown>)[1] as SvelthreeSupportedModifier[])
			: null
	}

	//  POINTER Event  CANVAS Component POINTER Event -> SHADOW DOM Event  -->  SHADOW DOM Event LISTENER -> SHADOW DOM Event HANDLER  -->  DISPATCH Component Event IMMEDIATELY / QUEUE  //

	// IMPORTANT  LIMITATIONS:
	// - if using directives  -> `once` should also be set as standard svelte modifier if set in modifiers-prop
	// - `modifiers` prop will affect directives and actions if these are being mixed
	// -  TODO  / CHECK evt.g. `on:click` without handler (forwarding) -> https://svelte.dev/docs#template-syntax-element-directives
	// the component itself should emit the event ... isn't this already like this?
	function add_pointer_listener(event_name: SvelthreeSupportedPointerEvent, dispatch_via_shadow_dom: boolean): void {
		// IMPORTANT  HACKY but simple: links and buttons are being handled as directives concerning modifiers etc.!
		const parent_state = parent.state()
		if (has_on_directive(event_name) || parent_state.link || parent_state.button) {
			if (event_not_registered(event_name, used_pointer_events_directive)) {
				const listener_options = get_listener_options_from_modifiers_prop(event_name)

				set_pointer_listeners(event_name, listener_options, dispatch_via_shadow_dom, "on_directive")

				register_event(event_name, used_pointer_events_directive)
			} else {
				//console.warn(`'${event_name}' already registered as directive event!`)
			}
		}

		const prop_action_handler: SvelthreePropActionHandler | undefined = parent_state[`on_${event_name}`]

		if (prop_action_handler) {
			if (event_not_registered(event_name, used_pointer_events_action)) {
				if (prop_action_is_simple(event_name)) {
					update_prop_action_modifiers(event_name, null)
					const listener_options = get_listener_options_from_modifiers_prop(event_name)

					set_pointer_listeners(event_name, listener_options, dispatch_via_shadow_dom, "prop_action")
				} else if (prop_action_is_complex(prop_action_handler)) {
					const modifiers_arr = get_prop_action_modifiers(prop_action_handler)
					update_prop_action_modifiers(event_name, modifiers_arr)

					const listener_options = modifiers_arr
						? get_listener_options_from_modifiers_arr(event_name, modifiers_arr)
						: null
					set_pointer_listeners(event_name, listener_options, dispatch_via_shadow_dom, "prop_action")
				} else {
					console.error(
						`SVELTHREE > ${c_name} > add_pointer_listener : Cannot process prop action for event ${event_name}, doesn't match required form.`
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
		let listener: ((evt: PointerEvent) => void) | undefined = undefined
		if (set_by === "prop_action") listener = pointerevents_handler_action
		if (set_by === "on_directive") listener = pointerevents_handler_directive

		//  IMPORTANT  only `pointermove` event is NOT being re-dispatched via shadow dom!
		if (dispatch_via_shadow_dom) {
			add_shadow_dom_pointer_listener(event_name, listener_options, listener)
		}

		add_canvas_pointer_listener(event_name)
	}

	function add_shadow_dom_pointer_listener(
		event_name: SvelthreeSupportedInteractionEvent,
		listener_options: { [key in SupportedAddEventListenerOption]?: boolean } | undefined | null,
		listener: ((evt: PointerEvent) => void) | undefined
	): void {
		if (shadow_dom_el && listener) {
			if (listener_options) {
				shadow_dom_el.addEventListener(event_name, listener as EventListener, listener_options)
			} else {
				shadow_dom_el.addEventListener(event_name, listener as EventListener)
			}
		}
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
				console.error(`SVELTHREE > ${c_name} > Pointer event '${event_name}' not implemented!`)
				break
		}
	}

	//  POINTER Event   CANVAS Component POINTER Event -> SHADOW DOM Event  `canvas_pointermove` -> `pointermove`

	const queued_pointer_move_events: (() => void)[] = []

	let remove_canvas_pointermove_listener: (() => void) | undefined
	function add_canvas_pointermove_listener(): void {
		remove_canvas_pointermove_listener = canvas_component?.$on("canvas_pointermove", (evt: CanvasComponentEvent) =>
			// check before dispatching 'pointermove' component event directly (not via shadow dom element)
			check_pointer_move(evt.detail.event as PointerEvent)
		)
	}

	const last_pointer_move: {
		clientX: number | undefined
		clientY: number | undefined
	} = {
		clientX: undefined,
		clientY: undefined
	}

	function pointer_has_not_moved_move(evt: PointerEvent): boolean {
		return last_pointer_move.clientX === evt.clientX && last_pointer_move.clientY === evt.clientY
	}

	function check_pointer_move(evt: PointerEvent) {
		if (
			used_pointer_events.has("pointermove") &&
			$pointer_over_canvas.status === true &&
			!pointer_has_not_moved_move(evt)
		) {
			// `check_pointer_move` & `check_pointer_moveover` use the same `pointerevent`
			// so we have to separate `last_pointer_...`
			last_pointer_move.clientX = evt.clientX
			last_pointer_move.clientY = evt.clientY

			// no check, no dispatch via shadow dom but also queue pointer move in "always" mode
			pointerevents_handler(get_pointerevent_modified_clone(evt))
		}
	}

	const queued_pointer_moveover_events: (() => void)[] = []

	//  POINTER Event   CANVAS Component POINTER Event -> SHADOW DOM Event  `canvas_pointermove` -> `pointermoveover`

	let remove_canvas_pointermoveover_listener: (() => void) | undefined
	function add_canvas_pointermoveover_listener(): void {
		remove_canvas_pointermoveover_listener = canvas_component?.$on(
			"canvas_pointermove",
			(evt: CanvasComponentEvent) =>
				// check before dispatching 'pointermoveover' component event via shadow dom element
				check_pointer_moveover(evt.detail.event as PointerEvent)
		)
	}

	const last_pointer_moveover: {
		clientX: number | undefined
		clientY: number | undefined
	} = {
		clientX: undefined,
		clientY: undefined
	}

	function pointer_has_not_moved_moveover(evt: PointerEvent): boolean {
		return last_pointer_moveover.clientX === evt.clientX && last_pointer_moveover.clientY === evt.clientY
	}

	/**
	 * - mode `always`: `e` ( _`pointer.event`_ ) is the last `pointermove` event detected / saved by the `Canvas` component.
	 * - mode `auto`: `e` ( _`evt.detail.event`_ ) is the `pointervent` passed as detail of the `canvas_pointermove` event dispatched by the `Canvas` component.
	 */
	function check_pointer_moveover(evt: PointerEvent) {
		//  IMPORTANT  -> `pointermoveover` is not a standard DOM event, so it will not bubble up back to the `<canvas>` element!
		if (shadow_dom_el) {
			if ($pointer_over_canvas.status === true) {
				if (
					intersects() &&
					used_pointer_events.has("pointermoveover") &&
					!pointer_has_not_moved_moveover(evt)
				) {
					// `check_pointer_move` & `check_pointer_moveover` use the same `pointerevent` so we have to separate `last_pointer_...`
					last_pointer_moveover.clientX = evt.clientX
					last_pointer_moveover.clientY = evt.clientY

					// immediatelly dispatch component event via shadow dom element
					shadow_dom_el.dispatchEvent(get_pointerevent_modified_clone(evt, "pointermoveover"))
				}
			}
		} else {
			console.error(
				`SVELTHREE > ${c_name} > check_pointer_moveover : Cannot dispatch PointerEvent '${evt.type}' via unavailable 'shadow_dom_el'!`,
				{ shadow_dom_el }
			)
		}
	}

	//  POINTER Event   CANVAS Component POINTER Event -> SHADOW DOM Event  `canvas_pointermove` -> `pointerover` / `pointerout`

	let remove_canvas_pointeroverout_listener: (() => void) | undefined
	function add_canvas_pointeroverout_listener(): void {
		remove_canvas_pointeroverout_listener = canvas_component?.$on(
			"canvas_pointermove",
			(evt: { detail: { event: PointerEvent } }) =>
				// check before dispatching 'pointerover' or 'pointerout' component event via shadow dom element
				check_pointer_overout(evt.detail.event)
		)
	}

	let pointer_is_over = false
	let pointer_is_out = true

	/**
	 * - mode `always`: `e` ( _`pointer.event`_ ) is the last `pointermove` event detected / saved by the `Canvas` component.
	 * - mode `auto`: `e` ( _`evt.detail.event`_ ) is the `pointervent` passed as detail of the `canvas_pointermove` event dispatched by the `Canvas` component.
	 */
	function check_pointer_overout(evt: PointerEvent) {
		if (shadow_dom_el) {
			if (intersects()) {
				if (!pointer_is_over) {
					pointer_is_over = true
					pointer_is_out = false

					if (used_pointer_events.has("pointerover")) {
						shadow_dom_el.dispatchEvent(get_pointerevent_modified_clone(evt, "pointerover"))
					}
				}
			} else {
				if (!pointer_is_out) {
					pointer_is_out = true
					pointer_is_over = false

					if (used_pointer_events.has("pointerout")) {
						shadow_dom_el.dispatchEvent(get_pointerevent_modified_clone(evt, "pointerout"))
					}
				}
			}
		} else {
			console.error(
				`SVELTHREE > ${c_name} > check_pointer_overout : Cannot dispatch PointerEvent '${evt.type}' via unavailable 'shadow_dom_el'!`,
				{ shadow_dom_el }
			)
		}
	}

	//  POINTER Event   CANVAS Component POINTER Event -> SHADOW DOM Event  `canvas_pointerdown` -> `pointerdown`

	let remove_canvas_pointerdown_listener: (() => void) | undefined
	function add_canvas_pointerdown_listener(): void {
		remove_canvas_pointerdown_listener = canvas_component?.$on(
			"canvas_pointerdown",
			(evt: { detail: { event: PointerEvent } }) => check_pointer_pointerdown(evt.detail.event)
		)
	}

	function check_pointer_pointerdown(evt: PointerEvent) {
		if (shadow_dom_el) {
			if (intersects()) {
				shadow_dom_el.dispatchEvent(get_pointerevent_modified_clone(evt))
			}
		} else {
			console.error(
				`SVELTHREE > ${c_name} > check_pointer_pointerdown : Cannot dispatch PointerEvent '${evt.type}' via unavailable 'shadow_dom_el'!`,
				{ shadow_dom_el }
			)
		}
	}

	//  POINTER Event   CANVAS Component POINTER Event -> SHADOW DOM Event  `canvas_pointerup` -> `pointerup`

	let remove_canvas_pointerup_listener: (() => void) | undefined
	function add_canvas_pointerup_listener(): void {
		remove_canvas_pointerup_listener = canvas_component?.$on(
			"canvas_pointerup",
			(evt: { detail: { event: PointerEvent } }) => check_pointer_pointerup(evt.detail.event)
		)
	}

	function check_pointer_pointerup(evt: PointerEvent) {
		if (shadow_dom_el) {
			if (intersects()) {
				shadow_dom_el.dispatchEvent(get_pointerevent_modified_clone(evt))
			}
		} else {
			console.error(
				`SVELTHREE > ${c_name} > check_pointer_pointerup : Cannot dispatch PointerEvent '${evt.type}' via unavailable 'shadow_dom_el'!`,
				{ shadow_dom_el }
			)
		}
	}

	//  POINTER Event   CANVAS Component POINTER Event -> SHADOW DOM Event  `canvas_click` -> `click`

	let remove_canvas_click_listener: (() => void) | undefined
	function add_canvas_click_listener(): void {
		remove_canvas_click_listener = canvas_component?.$on(
			"canvas_click",
			(evt: { detail: { event: PointerEvent } }) => check_pointer_click(evt.detail.event)
		)
	}

	/**
	 * - mode `always`: `e` ( _`pointer.event`_ ) is the last `pointermove` event detected / saved by the `Canvas` component.
	 * - mode `auto`: `e` ( _`evt.detail.event`_ ) is the `pointervent` passed as detail of the `canvas_pointermove` event dispatched by the `Canvas` component.
	 */
	function check_pointer_click(evt: PointerEvent) {
		if (shadow_dom_el) {
			if (raycaster && intersects()) {
				shadow_dom_el.dispatchEvent(get_pointerevent_modified_clone(evt))
			}
		} else {
			console.error(
				`SVELTHREE > ${c_name} > check_pointer_click : Cannot dispatch PointerEvent '${evt.type}' via unavailable 'shadow_dom_el'!`,
				{ shadow_dom_el }
			)
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
	function get_pointerevent_modified_clone(evt: PointerEvent, new_type: string | null = null): PointerEvent {
		const event_init: { [key: string]: unknown } = { composed: undefined }

		// we do this because simply spreading the event object -> `{...e}`:
		// "The spread operator only copies an object's own enumerable properties, not properties found higher on the prototype chain."
		// also we cannot simply alter the value of `composed` via the event object like evt.g. `evt.composed = false`
		for (const key in evt) {
			if (key !== "path") {
				event_init[key] = evt[key as keyof PointerEvent]
			}
		}

		//  IMPORTANT  Setting `composed` to false:
		// prevents propagation of the event (dispatched via a shadow element) to outer light dom.
		// see: https://developer.mozilla.org/en-US/docs/Web/API/Event/composed
		event_init.composed = false

		const cloned_and_modified_event: PointerEvent = new_type
			? new PointerEvent(new_type, event_init)
			: new PointerEvent(evt.type, event_init)
		return cloned_and_modified_event
	}

	/*  POINTER Event   DISPATCH Component Event IMMEDIATELY / QUEUE  */

	function pointerevents_handler_action(evt: PointerEvent): void {
		pointerevents_handler(evt, cancel_or_stop_propagation_action)
	}

	function pointerevents_handler_directive(evt: PointerEvent): void {
		pointerevents_handler(evt, cancel_or_stop_propagation_directive)
	}

	function pointerevents_handler(
		evt: PointerEvent,
		cancel_or_stop_propagation_fn: ((evt: PointerEvent | FocusEvent | KeyboardEvent) => void) | null = null
	): void {
		const render_mode = store?.rendererComponent?.get_mode()

		// TODO  `gotpointercapture`, `lostpointercapture` & `pointercancel` events usage needs to be explored!

		switch (render_mode) {
			case "always":
				// QUEUED EVENT DISPATCHING: dispatch our custom event / execute handler on next render (raf aligned)

				if (cancel_or_stop_propagation_fn) cancel_or_stop_propagation_fn(evt)

				switch (evt.type) {
					case "pointermove": {
						const queued_pointermove_event = () => dispatch_pointerevent_intersection_indep(evt)
						queued_pointer_move_events[0] = queued_pointermove_event
						break
					}
					case "pointermoveover": {
						const queued_pointermoveover_event = () => dispatch_pointerevent_intersection_dep(evt)
						queued_pointer_moveover_events[0] = queued_pointermoveover_event
						break
					}
					default: {
						const queued_pointer_event = () => dispatch_pointerevent_intersection_dep(evt)
						pointer_events_queue.push(queued_pointer_event)
						//pointer_events_queue.push(() => dispatch_pointerevent_intersection_dep(evt))
						break
					}
				}

				break
			case "auto":
				// IMMEDIATE EVENT DISPATCHING (not raf aligned) / any changes will schedule a new render (raf aligned)

				if (cancel_or_stop_propagation_fn !== null) cancel_or_stop_propagation_fn(evt)

				if (evt.type === "pointermove") {
					dispatch_pointerevent_intersection_indep(evt)
				} else {
					dispatch_pointerevent_intersection_dep(evt)
				}

				break
			default:
				console.error(
					`SVELTHREE > ${c_name} > pointerevents_handler : no such 'render_mode' -> ${render_mode}!`
				)
				break
		}
	}

	/** intersection dependent -> has raycaster_data! */
	function dispatch_pointerevent_intersection_dep(evt: PointerEvent) {
		const action_name = `on_${evt.type}`

		const detail: SvelthreePointerEventDetail = {
			evt,
			obj,
			comp: parent,
			raycaster_data
		}

		if (has_on_directive(evt.type)) dispatch_interaction(evt.type as SvelthreeSupportedPointerEvent, detail)
		if (has_prop_action(action_name)) dispatch_prop_action(action_name, evt.type, detail)
	}

	/** intersection independent -> no raycaster_data! */
	function dispatch_pointerevent_intersection_indep(evt: PointerEvent) {
		const action_name = `on_${evt.type}`

		const detail: SvelthreePointerEventDetail = {
			evt,
			obj,
			comp: parent
		}

		if (has_on_directive(evt.type)) dispatch_interaction(evt.type as SvelthreeSupportedPointerEvent, detail)
		if (has_prop_action(action_name)) dispatch_prop_action(action_name, evt.type, detail)
	}

	/*  FOCUS Event   NATIVE DOM / SHADOW DOM Event  -->  SHADOW DOM Event LISTENER -> SHADOW DOM Event HANDLER  -->  DISPATCH Component Event IMMEDIATELY / QUEUE  */

	/*  FOCUS Event   SHADOW DOM Event LISTENER -> SHADOW DOM Event HANDLER  */

	function add_focus_listener(event_name: SvelthreeSupportedFocusEvent): void {
		const parent_state = parent.state()

		if (has_on_directive(event_name)) {
			if (event_not_registered(event_name, used_focus_events_directive)) {
				const listener_options = get_listener_options_from_modifiers_prop(event_name)

				set_focus_listener(event_name, listener_options, "on_directive")
				register_event(event_name, used_focus_events_directive)
			} else {
				//console.warn(`'${event_name}' already registered as directive event!`)
			}
		}

		const prop_action_handler: SvelthreePropActionHandler | undefined = parent_state[`on_${event_name}`]

		if (prop_action_handler) {
			if (event_not_registered(event_name, used_focus_events_action)) {
				if (prop_action_is_simple(event_name)) {
					update_prop_action_modifiers(event_name, null)
					const listener_options = get_listener_options_from_modifiers_prop(event_name)

					set_focus_listener(event_name, listener_options, "prop_action")
				} else if (prop_action_is_complex(prop_action_handler)) {
					const modifiers_arr = get_prop_action_modifiers(prop_action_handler)
					update_prop_action_modifiers(event_name, modifiers_arr)

					const listener_options = modifiers_arr
						? get_listener_options_from_modifiers_arr(event_name, modifiers_arr)
						: null

					set_focus_listener(event_name, listener_options, "prop_action")
				} else {
					console.error(
						`SVELTHREE > ${c_name} > add_focus_listener : Cannot process prop action for event ${event_name}, doesn't match required form.`
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
		let listener: ((evt: FocusEvent) => void) | undefined = undefined
		if (set_by === "prop_action") listener = focusevents_handler_action
		if (set_by === "on_directive") listener = focusevents_handler_directive

		add_shadow_dom_focus_listeners(event_name, listener_options, listener)
	}

	function add_shadow_dom_focus_listeners(
		event_name: SvelthreeSupportedInteractionEvent,
		listener_options: { [key in SupportedAddEventListenerOption]?: boolean } | undefined | null,
		listener: ((evt: FocusEvent) => void) | undefined
	): void {
		if (shadow_dom_el && listener) {
			if (listener_options) {
				shadow_dom_el.addEventListener(event_name, listener as EventListener, listener_options)
			} else {
				shadow_dom_el.addEventListener(event_name, listener as EventListener)
			}
		}
	}

	/*  FOCUS Event   DISPATCH Component Event IMMEDIATELY / QUEUE  */

	function focusevents_handler_action(evt: FocusEvent): void {
		focusevents_handler(evt, cancel_or_stop_propagation_action)
	}

	function focusevents_handler_directive(evt: FocusEvent): void {
		focusevents_handler(evt, cancel_or_stop_propagation_directive)
	}

	function focusevents_handler(
		evt: FocusEvent,
		cancel_or_stop_propagation_fn: (evt: PointerEvent | FocusEvent | KeyboardEvent) => void
	): void {
		const render_mode = store?.rendererComponent?.get_mode()

		cancel_or_stop_propagation_fn(evt)

		switch (render_mode) {
			case "always": {
				// QUEUED EVENT DISPATCHING: dispatch our custom event / execute handler on next render (raf aligned)
				const queued_focus_event = () => dispatch_focusevent_intersection_indep(evt)
				focus_events_queue.push(queued_focus_event)
				break
			}
			case "auto":
				// IMMEDIATE EVENT DISPATCHING (not raf aligned) / any changes will schedule a new render (raf aligned)
				dispatch_focusevent_intersection_indep(evt)
				break
			default:
				console.error(`SVELTHREE > ${c_name} > focusevents_handler : no such 'render_mode' -> ${render_mode}!`)
				break
		}
	}

	function dispatch_focusevent_intersection_indep(evt: FocusEvent) {
		const action_name = `on_${evt.type}`

		const detail: SvelthreeFocusEventDetail = {
			evt,
			obj,
			comp: parent
		}

		// intersection independent -> no raycaster_data!
		if (has_on_directive(evt.type)) dispatch_interaction(evt.type as SvelthreeSupportedFocusEvent, detail)
		if (has_prop_action(action_name)) dispatch_prop_action(action_name, evt.type, detail)
	}

	/*  KEYBOARD Event   NATIVE DOM / SHADOW DOM Event  -->  SHADOW DOM Event LISTENER -> SHADOW DOM Event HANDLER  -->  DISPATCH Component Event IMMEDIATELY / QUEUE  */

	/*  KEYBOARD Event   GLOBAL Keyboard Event -> CANVAS Component Keyboard Event  -->  DISPATCH Component Event IMMEDIATELY / QUEUE  */

	/*  KEYBOARD Event   SHADOW DOM Event LISTENER -> SHADOW DOM Event HANDLER  */

	function add_keyboard_listener(event_name: SvelthreeSupportedKeyboardEvent): void {
		const parent_state = parent.state()

		if (has_on_directive(event_name)) {
			if (event_not_registered(event_name, used_keyboard_events_directive)) {
				const listener_options = get_listener_options_from_modifiers_prop(event_name)

				set_keyboard_listener(event_name, listener_options, "on_directive")

				register_event(event_name, used_keyboard_events_directive)
			} else {
				//console.warn(`'${event_name}' already registered as directive event!`)
			}
		}

		const prop_action_handler: SvelthreePropActionHandler | undefined = parent_state[`on_${event_name}`]

		if (prop_action_handler) {
			if (event_not_registered(event_name, used_keyboard_events_action)) {
				if (prop_action_is_simple(event_name)) {
					update_prop_action_modifiers(event_name, null)
					const listener_options = get_listener_options_from_modifiers_prop(event_name)

					set_keyboard_listener(event_name, listener_options, "prop_action")
				} else if (prop_action_is_complex(prop_action_handler)) {
					const modifiers_arr = get_prop_action_modifiers(prop_action_handler)
					update_prop_action_modifiers(event_name, modifiers_arr)

					const listener_options = modifiers_arr
						? get_listener_options_from_modifiers_arr(event_name, modifiers_arr)
						: null
					set_keyboard_listener(event_name, listener_options, "prop_action")
				} else {
					console.error(
						`SVELTHREE > ${c_name} > add_keyboard_listener : Cannot process prop action for event ${event_name}, doesn't match required form.`
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
		let modifiers_map: UserModifiersMap | undefined = undefined

		if (set_by === "prop_action") {
			modifiers_map = user_modifiers_action
		} else if (set_by === "on_directive") {
			modifiers_map = user_modifiers_prop
		}

		if (modifiers_map?.get(event_name)?.has("self")) {
			// listener is added directly to shadow dom.
			// The shadow dom element has to have focus in order to react to keyboard input.
			//  IMPORTANT  MODIFIERS possible! evt.g. `preventDefault` modifier will have 'local' effect.
			let listener: ((evt: KeyboardEvent) => void) | undefined = undefined
			if (set_by === "prop_action") listener = keyboardevents_handler_action
			if (set_by === "on_directive") listener = keyboardevents_handler_directive

			add_shadow_dom_keyboard_listener(event_name, listener_options, listener)
		} else {
			// <canvas> element is listening (listener attached to `window` or `document`) and spreading Keyboard events to all interactive
			// components via an internal event, evt.g. `canvas_keydown`, just like pointer events.
			//  IMPORTANT  NO MODIFIERS possible, evt.g. `preventDefault()` has to be called from inside some user defined global handler.
			add_canvas_keyboard_listener(event_name, set_by)
		}
	}

	function add_shadow_dom_keyboard_listener(
		event_name: SvelthreeSupportedInteractionEvent,
		listener_options: { [key in SupportedAddEventListenerOption]?: boolean } | undefined | null,
		listener: ((evt: KeyboardEvent) => void) | undefined
	): void {
		if (shadow_dom_el && listener) {
			if (listener_options) {
				shadow_dom_el.addEventListener(event_name, listener as EventListener, listener_options)
			} else {
				shadow_dom_el.addEventListener(event_name, listener as EventListener)
			}
		}
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
				console.error(`SVELTHREE > ${c_name} : Keyboard event '${event_name}' not implemented!`)
				break
		}
	}

	//  KEYBOARD Event   GLOBAL Keyboard Event -> CANVAS Component Keyboard Event  `canvas_keydown` -> `keydown`

	let remove_canvas_keydown_listener_action: (() => void) | undefined
	function add_canvas_keydown_listener_action(): void {
		remove_canvas_keydown_listener_action = canvas_component?.$on("canvas_keydown", (evt: CanvasComponentEvent) =>
			// global keyboard listener -> we cancel nothing! so we can use the standard handler directly!
			keyboardevents_handler(evt.detail.event as KeyboardEvent, null)
		)
	}

	let remove_canvas_keydown_listener_directive: (() => void) | undefined
	function add_canvas_keydown_listener_directive(): void {
		remove_canvas_keydown_listener_directive = canvas_component?.$on(
			"canvas_keydown",
			(evt: CanvasComponentEvent) =>
				// global keyboard listener -> we cancel nothing! so we can use the standard handler directly!
				keyboardevents_handler(evt.detail.event as KeyboardEvent, null)
		)
	}

	//  KEYBOARD Event   GLOBAL Keyboard Event -> CANVAS Component Keyboard Event  `canvas_keyup` -> `keyup`

	let remove_canvas_keyup_listener_action: (() => void) | undefined
	function add_canvas_keyup_listener_action(): void {
		remove_canvas_keyup_listener_action = canvas_component?.$on("canvas_keyup", (evt: CanvasComponentEvent) =>
			// global keyboard listener -> we cancel nothing! so we can use the standard handler directly!
			keyboardevents_handler(evt.detail.event as KeyboardEvent, null)
		)
	}

	let remove_canvas_keyup_listener_directive: (() => void) | undefined
	function add_canvas_keyup_listener_directive(): void {
		remove_canvas_keyup_listener_directive = canvas_component?.$on("canvas_keyup", (evt: CanvasComponentEvent) =>
			// global keyboard listener -> we cancel nothing! so we can use the standard handler directly!
			keyboardevents_handler(evt.detail.event as KeyboardEvent, null)
		)
	}

	//  KEYBOARD Event   GLOBAL Keyboard Event -> CANVAS Component Keyboard Event  `canvas_press` -> `keypress`

	let remove_canvas_keypress_listener_action: (() => void) | undefined
	function add_canvas_keypress_listener_action(): void {
		remove_canvas_keypress_listener_action = canvas_component?.$on("canvas_keypress", (evt: CanvasComponentEvent) =>
			keyboardevents_handler(evt.detail.event as KeyboardEvent, null)
		)
	}

	let remove_canvas_keypress_listener_directive: (() => void) | undefined
	function add_canvas_keypress_listener_directive(): void {
		remove_canvas_keypress_listener_directive = canvas_component?.$on(
			"canvas_keypress",
			(evt: CanvasComponentEvent) => keyboardevents_handler(evt.detail.event as KeyboardEvent, null)
		)
	}

	/*  KEYBOARD Event   DISPATCH Component Event IMMEDIATELY / QUEUE  */

	function keyboardevents_handler_action(evt: KeyboardEvent): void {
		keyboardevents_handler(evt, cancel_or_stop_propagation_action)
	}

	function keyboardevents_handler_directive(evt: KeyboardEvent): void {
		keyboardevents_handler(evt, cancel_or_stop_propagation_directive)
	}

	function keyboardevents_handler(
		evt: KeyboardEvent,
		cancel_or_stop_propagation_fn: ((evt: PointerEvent | FocusEvent | KeyboardEvent) => void) | null
	): void {
		const render_mode = store?.rendererComponent?.get_mode()

		//  IMPORTANT  //
		// any specified `default_keyboard_events_handler` for the received keyboard event
		// will override any present `preventDefault` and `stopPropagation` modifier prop setting.

		// TODO  improve / simplify
		const is_default_keyboard_handler_specified: boolean | null = default_keyboard_handler_specified(evt.type)
		if (is_default_keyboard_handler_specified === true) {
			if (canvas_component) {
				canvas_component.default_keyboard_events_handler[evt.type](evt)
			} else {
				console.error(
					`SVELTHREE > ${c_name} > keyboardevents_handler : Couldn't call 'canvas_component.default_keyboard_events_handler[evt.type](evt)', 'canvas_component' is not available!`,
					{ canvas_component }
				)
			}
		} else if (is_default_keyboard_handler_specified === false) {
			if (cancel_or_stop_propagation_fn) cancel_or_stop_propagation_fn(evt)
		} else if (is_default_keyboard_handler_specified === null) {
			console.error(
				`SVELTHREE > ${c_name} > keyboardevents_handler : 'is_default_keyboard_handler_specified' is 'null', means 'canvas_component' is not available!`,
				{ canvas_component }
			)
		}

		switch (render_mode) {
			case "always": {
				// QUEUED EVENT DISPATCHING: dispatch our custom event / execute handler on next render (raf aligned)
				const queued_keyboard_event = () => dispatch_keyboardevent_intersection_indep(evt)
				keyboard_events_queue.push(queued_keyboard_event)
				break
			}
			case "auto":
				// IMMEDIATE EVENT DISPATCHING (not raf aligned) / any changes will schedule a new render (raf aligned)
				dispatch_keyboardevent_intersection_indep(evt)
				break
			default:
				console.error(
					`SVELTHREE > ${c_name} > keyboardevents_handler : no such 'render_mode' -> ${render_mode}!`
				)
				break
		}
	}

	function default_keyboard_handler_specified(event_name: KeyboardEvent["type"]): boolean | null {
		if (canvas_component) {
			return (
				canvas_component.default_keyboard_events_handler &&
				canvas_component.default_keyboard_events_handler[event_name]
			)
		} else {
			console.error(
				`SVELTHREE > ${c_name} > default_keyboard_handler_specified : 'canvas_component' not available!`,
				{ canvas_component }
			)
			return false
		}
	}

	function dispatch_keyboardevent_intersection_indep(evt: KeyboardEvent) {
		const action_name = `on_${evt.type}`

		const detail: SvelthreeKeyboardEventDetail = {
			code: evt.code,
			evt,
			obj,
			comp: parent
		}

		// intersection independent -> no raycaster_data!
		if (has_on_directive(evt.type)) dispatch_interaction(evt.type as SvelthreeSupportedKeyboardEvent, detail)
		if (has_prop_action(action_name)) dispatch_prop_action(action_name, evt.type, detail)
	}

	/*  CANCEL OR STOP PROPAGATION  */

	/**
	 * -  IMPORTANT :
	 * `modifiers` prop **affects both** _`on:` directives_ **and** _prop actions_,
	 * but _prop action modifiers_ **do NOT affect** the `modifiers` prop / _`on:` directives_!
	 *
	 * -  IMPORTANT  mode `"always"`:
	 *   calling `evt.preventDefault()` / `evt.stopPropagation()` inside a handler **will have NO effect** ☝️,
	 * because the was already emitted at some point during the animation, so `evt.preventDefault()` / `evt.stopPropagation()` **HAVE TO**
	 * be set via `modifiers` prop in order to cancel event's default (DOM) action or stop propagation at the exact same moment it occured.
	 *
	 * -  IMPORTANT  mode `"auto"`:
	 *   calling `evt.preventDefault()` inside a handler **will have effect** ☝️, means
	 * `evt.preventDefault()` / `evt.stopPropagation()` **CAN** but **do NOT HAVE TO** be set via `modifiers` prop
	 * in order to cancel event's default (DOM) action or stop propagation at the exact same moment it occured.
	 */
	function cancel_or_stop_propagation_action(evt: PointerEvent | FocusEvent | KeyboardEvent): void {
		const e_type = evt.type as SvelthreeSupportedInteractionEvent
		if (
			user_modifiers_action.get(e_type)?.has("preventDefault") ||
			user_modifiers_prop.get("all")?.has("preventDefault") ||
			user_modifiers_prop.get(e_type)?.has("preventDefault")
		)
			prevent_default(evt)
		if (
			user_modifiers_action.get(e_type)?.has("stopPropagation") ||
			user_modifiers_prop.get("all")?.has("stopPropagation") ||
			user_modifiers_prop.get(e_type)?.has("stopPropagation")
		)
			stop_propagation(evt)
	}

	function cancel_or_stop_propagation_directive(evt: PointerEvent | FocusEvent | KeyboardEvent): void {
		if (
			user_modifiers_prop.get("all")?.has("preventDefault") ||
			user_modifiers_prop.get(evt.type as SvelthreeSupportedInteractionEvent)?.has("preventDefault")
		) {
			prevent_default(evt)
		}
		if (
			user_modifiers_prop.get("all")?.has("stopPropagation") ||
			user_modifiers_prop.get(evt.type as SvelthreeSupportedInteractionEvent)?.has("stopPropagation")
		) {
			stop_propagation(evt)
		}
	}

	function prevent_default(evt: PointerEvent | FocusEvent | KeyboardEvent) {
		if (verbose && log_dev) console.info(...c_dev(c_name, "prevent_default!"))
		evt.preventDefault()
	}

	function stop_propagation(evt: PointerEvent | FocusEvent | KeyboardEvent) {
		if (verbose && log_dev) console.info(...c_dev(c_name, "stop_propagation!"))
		evt.stopPropagation()
	}

	/*  ADDING AND REGISTERING  */

	/** for `SvelthreeInteraction` component's reactive listener management only */
	export let update_listeners = false

	let r_added_on_init = false
	// reactive listener management checks
	$: r_add_on_init = interactionEnabled && listeners
	$: r_remove = !interactionEnabled && listeners

	// Reactively add / remove pointer listeners, works with evt.g. (syntax):

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
		const parent_state = parent.state()

		r_added_on_init = true
		update_listeners = false

		//console.warn("UPDATE LISTENERS!")

		// --- ADD / REGISTER USED EVENTS / LISTENERS ---

		// will be queued in mode "always"
		// will be dispatsched immediately in mode "auto" -> see 'pointerevents_handler'
		if (using_event("click") || parent_state.button || parent_state.link) add_pointer_listener("click", true)
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

		if (not_using_event("click") && !parent_state.button && !parent_state.link)
			completely_remove_pointer_listener("click")
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

		if (obj) {
			if (store) {
				if (!obj.userData.block) {
					if (store.rendererComponent?.get_mode() === "always" && !remove_interaction_2_listener) {
						add_interaction_2_listener()
					}
				} else {
					if (store.rendererComponent?.get_mode() === "always" && remove_interaction_2_listener) {
						remove_interaction_2_listener()
						remove_interaction_2_listener = null
					}
				}

				if (store.rendererComponent?.get_mode() === "always" && !remove_interaction_3_listener) {
					add_interaction_3_listener()
				}
			}
		}
	}

	/**
	 * Changes component's `block` status based on pointer listeners' total count.
	 * If no pointer listeners are set, `block` will be set to `true`, means
	 * cursor will not change (_cursor changes on `interact: true` + `block: false` only_).
	 */
	function set_block_status(): void {
		let parent_state = parent.state()

		//cursor will change on `interact: true` + `block: false`
		if (verbose && log_dev)
			console.debug(
				`SVELTHREE > ${c_name} > set_block_status : used_pointer_events.size:`,
				used_pointer_events.size
			)
		if (used_pointer_events.size === 0) {
			// cursor will not change
			parent.$set({ block: true })
			parent_state = parent.state()
			if (obj) {
				obj.userData.block = true
				if (verbose && log_dev) {
					console.debug(
						`SVELTHREE > ${c_name} > set_block_status : parent.block, obj.userData.block -> true`,
						{
							parent,
							parent_block: parent_state.block,
							obj_userData_block: obj.userData.block
						}
					)
				}
			} else {
				console.error(
					`SVELTHREE > ${c_name} > set_block_status : Couldn't set 'obj.userData.block' to 'true', invalid 'obj' value!`,
					{ obj }
				)
			}
		} else {
			// cursor will change
			parent.$set({ block: true })
			parent_state = parent.state()
			if (verbose && log_dev) {
				console.debug(`SVELTHREE > ${c_name} > set_block_status : parent.block -> false`, {
					parent,
					parent_block: parent_state.block
				})
			}
			//obj.userData.block = false
		}
	}

	function register_event(event_name: SvelthreeSupportedInteractionEvent, target_set: Set<string>) {
		if (canvas_component) {
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
		} else {
			console.error(
				`SVELTHREE > > ${c_name} > register_event : Cannot register '${event_name}' Event on 'Canvas' component, 'canvas_component' not available!`,
				{ canvas_component }
			)
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

	export const remove_all_listeners = (): void => {
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

		//  SVELTEKIT  CSR ONLY  keyboard event listeners are being added to `window`.
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
						`SVELTHREE > ${c_name} > completely_remove_keyboard_listener : Keyboard event '${event_name}' not implemented!`
					)
					break
			}

			if (shadow_dom_el) {
				shadow_dom_el.removeEventListener(event_name, keyboardevents_handler_action as EventListener, false)
				shadow_dom_el.removeEventListener(event_name, keyboardevents_handler_action as EventListener, true)
				shadow_dom_el.removeEventListener(event_name, keyboardevents_handler_directive as EventListener, false)
				shadow_dom_el.removeEventListener(event_name, keyboardevents_handler_directive as EventListener, true)
			} else {
				console.error(
					`SVELTHREE > ${c_name} > completely_remove_keyboard_listener : Cannot remove listener from unavailable 'shadow_dom_el'!`,
					{ shadow_dom_el }
				)
			}

			unregister_keyboard_event(event_name)
		}
	}

	function unregister_keyboard_event(event_name: SvelthreeSupportedInteractionEvent) {
		delete_event_from_set(event_name, used_keyboard_events_directive)
		delete_event_from_set(event_name, used_keyboard_events_action)
		delete_event_from_set(event_name, used_keyboard_events)

		if (canvas_component) {
			canvas_component.unregister_canvas_listener(event_name)
		} else {
			console.error(
				`SVELTHREE > ${c_name} > unregister_keyboard_event : Cannot unregister '${event_name}' Event on 'Canvas' component, 'canvas_component' not available!`,
				{ canvas_component }
			)
		}
	}

	function remove_all_focus_listeners(): void {
		for (let i = 0; i < FOCUS_EVENTS.length; i++) {
			completely_remove_focus_listener(FOCUS_EVENTS[i])
		}
	}

	// remove unused but registered (were used) listeners
	function completely_remove_focus_listener(event_name: SvelthreeSupportedInteractionEvent): void {
		if (event_is_registered(event_name, used_focus_events)) {
			if (shadow_dom_el) {
				shadow_dom_el.removeEventListener(event_name, focusevents_handler_action as EventListener, true)
				shadow_dom_el.removeEventListener(event_name, focusevents_handler_action as EventListener, false)
				shadow_dom_el.removeEventListener(event_name, focusevents_handler_directive as EventListener, true)
				shadow_dom_el.removeEventListener(event_name, focusevents_handler_directive as EventListener, false)
			} else {
				console.error(
					`SVELTHREE > ${c_name} > completely_remove_focus_listener : Cannot remove '${event_name}' listener from unavailable 'shadow_dom_el'!`,
					{ shadow_dom_el }
				)
			}
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
						`SVELTHREE > ${c_name} > completely_remove_pointer_listener : Pointer event '${event_name}' not implemented!`
					)
					break
			}

			if (shadow_dom_el) {
				shadow_dom_el.removeEventListener(event_name, pointerevents_handler_action as EventListener, false)
				shadow_dom_el.removeEventListener(event_name, pointerevents_handler_action as EventListener, true)
				shadow_dom_el.removeEventListener(event_name, pointerevents_handler_directive as EventListener, false)
				shadow_dom_el.removeEventListener(event_name, pointerevents_handler_directive as EventListener, true)
			} else {
				console.error(
					`SVELTHREE > ${c_name} > completely_remove_pointer_listener : Cannot remove '${event_name}' listener from unavailable 'shadow_dom_el'!`,
					{ shadow_dom_el }
				)
			}

			unregister_pointer_event(event_name)
		}
	}

	function unregister_pointer_event(event_name: SvelthreeSupportedInteractionEvent) {
		delete_event_from_set(event_name, used_pointer_events_directive)
		delete_event_from_set(event_name, used_pointer_events_action)
		delete_event_from_set(event_name, used_pointer_events)

		if (canvas_component) {
			switch (event_name) {
				case "click":
				case "pointerdown":
				case "pointerup":
					canvas_component.unregister_canvas_listener(event_name)
					break
				default:
					break
			}
		} else {
			console.error(
				`SVELTHREE > ${c_name} > unregister_pointer_event : Cannot unregister '${event_name}' Event on 'Canvas' component, 'canvas_component' not available!`,
				{ canvas_component }
			)
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

	function dispatch_prop_action(action_name: string, e_type: string, detail: SvelthreeInteractionEventDetail) {
		const evt = new CustomEvent(e_type, { detail })
		const parent_state = parent.state()
		const action = parent_state[action_name as keyof typeof parent_state] as unknown

		if (action) {
			if (typeof action === "function") {
				action(evt)
			} else if (Array.isArray(action)) {
				if (typeof action[0] === "function") {
					action[0](evt)
				} else {
					console.error(
						`SVELTHREE > ${c_name} > dispatch_prop_action : provided '${action_name}' action prop is not of valid type! First item in the provided Array should be a function!`,
						{ action_name, action }
					)
				}
			} else {
				console.error(
					`SVELTHREE > ${c_name} > dispatch_prop_action : provided '${action_name}' action prop is not of valid type!`,
					{ action_name, action }
				)
			}
		} else {
			console.error(
				`SVELTHREE > ${c_name} > dispatch_prop_action : '${action_name}' action prop is not available!`,
				{ action_name, action }
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
