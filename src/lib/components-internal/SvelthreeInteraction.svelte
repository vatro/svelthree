<!-- 
@component
This is a **svelthree** _SvelthreeInteraction_ Component.  
[ tbd ]  Link to Docs.
-->
<script lang="ts">
	import { onMount, beforeUpdate, afterUpdate, onDestroy, getContext } from "svelte"
	import { get_current_component } from "svelte/internal"
	import type { Object3D, Raycaster } from "three"
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
		SvelthreeInteractionEventDetail,
		SvelthreeSupportedWheelEvent,
		SvelthreeWheelEventDetail,
		MapPropUserModifiers,
		MapOnPropUserModifiers,
		UserModifiersMap
	} from "../types/types-extra.js"
	import type { Writable } from "svelte/store"
	import { KEYBOARD_EVENTS, FOCUS_EVENTS, POINTER_EVENTS, WHEEL_EVENTS } from "../constants/Interaction.js"
	import type {
		SvelthreeSupportedInteractionEvent,
		SupportedAddEventListenerOption,
		SvelthreeEventModifier,
		SvelthreeModifiersProp,
		SvelthreeSupportedKeyboardEvent,
		SvelthreeSupportedFocusEvent,
		SvelthreeSupportedPointerEvent,
		SvelthreeOnPropHandler
	} from "../types/types-extra.js"

	import {
		set_modifiers_map_prop,
		set_modifiers_map_on_prop,
		get_listener_options_from_modifiers_prop,
		get_listener_options_from_modifiers_arr
	} from "../utils/interaction/modifier_utils.js"

	import { get_intersects_and_set_raycaster_data } from "../utils/interaction/intersection.js"
	import { create_check_pointer_overout, create_check_pointer_moveover } from "../utils/interaction/pointerevents.js"
	import { execute_queued_events, execute_last_queued_event } from "../utils/interaction/eventqueue_utils.js"
	import {
		has_on_directive,
		has_on_prop,
		using_event,
		not_using_event,
		on_prop_is_simple,
		on_prop_is_complex
	} from "../utils/interaction/parent_comp_utils.js"

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

	/** `modifiers` prop of the parent component. */
	export let modifiers: SvelthreeModifiersProp | undefined = undefined
	const user_modifiers_prop: MapPropUserModifiers = new Map()
	const user_modifiers_on_prop: MapOnPropUserModifiers = new Map()
	$: if (modifiers) set_modifiers_map_prop(user_modifiers_prop, modifiers)

	let raycaster: Raycaster | undefined
	$: raycaster = store?.raycaster

	export let dispatch_interaction: SvelthreeInteractionEventDispatcher

	const pointer: PointerState = getContext("pointer")

	const all_intersections: AllIntersections = getContext("all_intersections")
	const raycaster_data: RaycasterData = {}
	const intersects = (): boolean => {
		return get_intersects_and_set_raycaster_data(raycaster, all_intersections, obj, raycaster_data, pointer)
	}

	const canvas_dom: Writable<{ element: HTMLCanvasElement }> = getContext("canvas_dom")
	const pointer_over_canvas: Writable<{ status: boolean }> = getContext("pointer_over_canvas")
	const canvas_component = store?.canvas.svelthreeComponent

	const pointer_events_queue: (() => void)[] = []
	const keyboard_events_queue: (() => void)[] = []
	const focus_events_queue: (() => void)[] = []
	const wheel_events_queue: (() => void)[] = []

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
	 * Triggers `pointerover` / `pointerout` events -> even if the pointer is not moving, e.g. if the pointer
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
		execute_last_queued_event(queued_pointer_move_events)
		execute_last_queued_event(queued_pointer_moveover_events)
		execute_queued_events(pointer_events_queue)
	}

	//  RENDER EVENT interaction_3  ALWAYS  ->  IMPORTANT  In mode `always` ALL component / shadow dom EVENTS are queued!

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
	 * - executes all / any queued focus / keyboard / wheel events ( _raf aligned_ ) on each rendered frame.
	 */
	function on_interaction_3(): void {
		execute_queued_events(focus_events_queue)
		execute_queued_events(keyboard_events_queue)
		execute_queued_events(wheel_events_queue)
	}

	// LISTENER MANAGEMENT //

	const used_pointer_events_on_directive = new Set<string>([])
	const used_pointer_events_on_prop = new Set<string>([])
	let used_pointer_events = new Set<string>([])

	/** Dispatches a **cloned** `'pointerover'`/`'pointerout'` PointerEvent via the **shadow DOM element**. */
	const check_pointer_overout = create_check_pointer_overout(
		shadow_dom_el,
		intersects,
		used_pointer_events,
		get_pointerevent_modified_clone,
		c_name
	)

	/**
	 * Dispatches a **cloned** `'pointermoveover'` PointerEvent via the **shadow DOM element**.
	 * - mode `always`: `e` ( _`pointer.event`_ ) is the last `pointermove` event detected / saved by the `Canvas` component.
	 * - mode `auto`: `e` ( _`evt.detail.event`_ ) is the `pointervent` passed as detail of the `canvas_pointermove` event dispatched by the `Canvas` component.
	 */
	const check_pointer_moveover = create_check_pointer_moveover(
		shadow_dom_el,
		pointer_over_canvas,
		intersects,
		used_pointer_events,
		get_pointerevent_modified_clone,
		c_name
	)

	const used_keyboard_events_on_directive = new Set<string>([])
	const used_keyboard_events_on_prop = new Set<string>([])
	let used_keyboard_events = new Set<string>([])

	const used_focus_events_on_directive = new Set<string>([])
	const used_focus_events_on_prop = new Set<string>([])
	let used_focus_events = new Set<string>([])

	const used_wheel_events_on_directive = new Set<string>([])
	const used_wheel_events_on_prop = new Set<string>([])
	let used_wheel_events = new Set<string>([])

	type HandlerSetBy = "on_directive" | "on_prop"

	function get_on_prop_modifiers(on_prop_handler: SvelthreeOnPropHandler): SvelthreeEventModifier[] | null {
		return (on_prop_handler as Array<unknown>).length > 1
			? ((on_prop_handler as Array<unknown>)[1] as SvelthreeEventModifier[])
			: null
	}

	//  POINTER Event  CANVAS Component POINTER Event -> SHADOW DOM Event  -->  SHADOW DOM Event LISTENER -> SHADOW DOM Event HANDLER  -->  DISPATCH Component Event IMMEDIATELY / QUEUE  //

	// IMPORTANT  LIMITATIONS:
	// - if using directives  -> `once` should also be set as standard svelte modifier if set in modifiers-prop
	// - `modifiers` prop will affect directives and actions if these are being mixed
	// -  TODO  / CHECK e.g. `on:click` without handler (forwarding) -> https://svelte.dev/docs#template-syntax-element-directives
	// the component itself should emit the event ... isn't this already like this?
	function add_pointer_listener(event_name: SvelthreeSupportedPointerEvent, dispatch_via_shadow_dom: boolean): void {
		// IMPORTANT  HACKY but simple: links and buttons are being handled as directives concerning modifiers etc.!
		const parent_state = parent.state()
		if (has_on_directive(event_name, parent) || parent_state.link || parent_state.button) {
			if (event_not_registered(event_name, used_pointer_events_on_directive)) {
				const listener_options = get_listener_options_from_modifiers_prop(event_name, user_modifiers_prop)

				set_pointer_listeners(event_name, listener_options, dispatch_via_shadow_dom, "on_directive")

				register_event(event_name, used_pointer_events_on_directive)
			} else {
				//console.warn(`'${event_name}' already registered in 'used_pointer_events_on_directive'!`)
			}
		}

		const on_prop_handler: SvelthreeOnPropHandler | undefined = parent_state[`on_${event_name}`]

		if (on_prop_handler) {
			if (event_not_registered(event_name, used_pointer_events_on_prop)) {
				if (on_prop_is_simple(event_name, parent)) {
					set_modifiers_map_on_prop(event_name, null, user_modifiers_prop, user_modifiers_on_prop)
					const listener_options = get_listener_options_from_modifiers_prop(event_name, user_modifiers_prop)

					set_pointer_listeners(event_name, listener_options, dispatch_via_shadow_dom, "on_prop")
				} else if (on_prop_is_complex(on_prop_handler)) {
					const modifiers_arr = get_on_prop_modifiers(on_prop_handler)
					set_modifiers_map_on_prop(event_name, modifiers_arr, user_modifiers_prop, user_modifiers_on_prop)

					const listener_options = modifiers_arr
						? get_listener_options_from_modifiers_arr(event_name, modifiers_arr, user_modifiers_prop)
						: null
					set_pointer_listeners(event_name, listener_options, dispatch_via_shadow_dom, "on_prop")
				} else {
					console.error(
						`SVELTHREE > ${c_name} > add_pointer_listener : Cannot process 'on_${event_name}' prop, doesn't match required form.`
					)
				}

				register_event(event_name, used_pointer_events_on_prop)
			} else {
				//console.warn(`'${event_name}' already registered in 'used_pointer_events_on_prop'!`)
			}
		}

		// update used pointer events (without creating a new Set -> otherwise references to `used_pointer_events` would become invalid in Closures or Classes.)
		used_pointer_events.clear()
		used_pointer_events_on_directive.forEach((element) => used_pointer_events.add(element))
		used_pointer_events_on_prop.forEach((element) => used_pointer_events.add(element))
	}

	function set_pointer_listeners(
		event_name: SvelthreeSupportedPointerEvent,
		listener_options: { [key in SupportedAddEventListenerOption]?: boolean } | undefined | null,
		dispatch_via_shadow_dom: boolean,
		set_by: HandlerSetBy
	) {
		let listener: ((evt: PointerEvent) => void) | undefined = undefined
		if (set_by === "on_prop") listener = pointerevents_handler_on_prop
		if (set_by === "on_directive") listener = pointerevents_handler_on_directive

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
			pointerevents_handler(get_pointerevent_modified_clone(evt), null)
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
		// also we cannot simply alter the value of `composed` via the event object like e.g. `evt.composed = false`
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

	function pointerevents_handler_on_prop(evt: PointerEvent): void {
		pointerevents_handler(evt, cancel_or_stop_propagation_on_prop)
	}

	function pointerevents_handler_on_directive(evt: PointerEvent): void {
		pointerevents_handler(evt, cancel_or_stop_propagation_on_directive)
	}

	function pointerevents_handler(
		evt: PointerEvent,
		cancel_or_stop_propagation_fn: typeof cancel_or_stop_propagation_on_prop | null = null
	): void {
		const render_mode = store?.rendererComponent?.get_mode()

		if (cancel_or_stop_propagation_fn) cancel_or_stop_propagation_fn(evt)

		// TODO  `gotpointercapture`, `lostpointercapture` & `pointercancel` events usage needs to be explored!

		switch (render_mode) {
			case "always":
				// QUEUED EVENT DISPATCHING: dispatch our custom event / execute handler on next render (raf aligned)

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
		const on_prop_name = `on_${evt.type}`

		const detail: SvelthreePointerEventDetail = {
			evt,
			obj,
			comp: parent,
			raycaster_data
		}

		if (has_on_directive(evt.type, parent)) dispatch_interaction(evt.type as SvelthreeSupportedPointerEvent, detail)
		if (has_on_prop(on_prop_name, parent)) call_on_prop_handler(on_prop_name, evt.type, detail)
	}

	/** intersection independent -> no raycaster_data! */
	function dispatch_pointerevent_intersection_indep(evt: PointerEvent) {
		const on_prop_name = `on_${evt.type}`

		const detail: SvelthreePointerEventDetail = {
			evt,
			obj,
			comp: parent
		}

		if (has_on_directive(evt.type, parent)) dispatch_interaction(evt.type as SvelthreeSupportedPointerEvent, detail)
		if (has_on_prop(on_prop_name, parent)) call_on_prop_handler(on_prop_name, evt.type, detail)
	}

	/*  FOCUS Event   NATIVE DOM / SHADOW DOM Event  -->  SHADOW DOM Event LISTENER -> SHADOW DOM Event HANDLER  -->  DISPATCH Component Event IMMEDIATELY / QUEUE  */

	/*  FOCUS Event   SHADOW DOM Event LISTENER -> SHADOW DOM Event HANDLER  */

	function add_focus_listener(event_name: SvelthreeSupportedFocusEvent): void {
		const parent_state = parent.state()

		if (has_on_directive(event_name, parent)) {
			if (event_not_registered(event_name, used_focus_events_on_directive)) {
				const listener_options = get_listener_options_from_modifiers_prop(event_name, user_modifiers_prop)

				set_focus_listener(event_name, listener_options, "on_directive")
				register_event(event_name, used_focus_events_on_directive)
			} else {
				//console.warn(`'${event_name}' already registered in 'used_pointer_events_on_directive'!`)
			}
		}

		const on_prop_handler: SvelthreeOnPropHandler | undefined = parent_state[`on_${event_name}`]

		if (on_prop_handler) {
			if (event_not_registered(event_name, used_focus_events_on_prop)) {
				if (on_prop_is_simple(event_name, parent)) {
					set_modifiers_map_on_prop(event_name, null, user_modifiers_prop, user_modifiers_on_prop)
					const listener_options = get_listener_options_from_modifiers_prop(event_name, user_modifiers_prop)

					set_focus_listener(event_name, listener_options, "on_prop")
				} else if (on_prop_is_complex(on_prop_handler)) {
					const modifiers_arr = get_on_prop_modifiers(on_prop_handler)
					set_modifiers_map_on_prop(event_name, modifiers_arr, user_modifiers_prop, user_modifiers_on_prop)

					const listener_options = modifiers_arr
						? get_listener_options_from_modifiers_arr(event_name, modifiers_arr, user_modifiers_prop)
						: null

					set_focus_listener(event_name, listener_options, "on_prop")
				} else {
					console.error(
						`SVELTHREE > ${c_name} > add_focus_listener : Cannot process 'on_${event_name}' prop, doesn't match required form.`
					)
				}

				register_event(event_name, used_focus_events_on_prop)
			} else {
				//console.warn(`'${event_name}' already registered in 'used_pointer_events_on_prop'!`)
			}
		}

		// update used focus events
		used_focus_events = new Set([...used_focus_events_on_directive, ...used_focus_events_on_prop])
	}

	function set_focus_listener(
		event_name: SvelthreeSupportedFocusEvent,
		listener_options: { [key in SupportedAddEventListenerOption]?: boolean } | undefined | null,
		set_by: HandlerSetBy
	) {
		let listener: ((evt: FocusEvent) => void) | undefined = undefined
		if (set_by === "on_prop") listener = focusevents_handler_on_prop
		if (set_by === "on_directive") listener = focusevents_handler_on_directive

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

	function focusevents_handler_on_prop(evt: FocusEvent): void {
		focusevents_handler(evt, cancel_or_stop_propagation_on_prop)
	}

	function focusevents_handler_on_directive(evt: FocusEvent): void {
		focusevents_handler(evt, cancel_or_stop_propagation_on_directive)
	}

	function focusevents_handler(
		evt: FocusEvent,
		cancel_or_stop_propagation_fn: typeof cancel_or_stop_propagation_on_prop
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
		const on_prop_name = `on_${evt.type}`

		const detail: SvelthreeFocusEventDetail = {
			evt,
			obj,
			comp: parent
		}

		// intersection independent -> no raycaster_data!
		if (has_on_directive(evt.type, parent)) dispatch_interaction(evt.type as SvelthreeSupportedFocusEvent, detail)
		if (has_on_prop(on_prop_name, parent)) call_on_prop_handler(on_prop_name, evt.type, detail)
	}

	/*  KEYBOARD Event   NATIVE DOM / SHADOW DOM Event  -->  SHADOW DOM Event LISTENER -> SHADOW DOM Event HANDLER  -->  DISPATCH Component Event IMMEDIATELY / QUEUE  */

	/*  KEYBOARD Event   GLOBAL Keyboard Event -> CANVAS Component Keyboard Event  -->  DISPATCH Component Event IMMEDIATELY / QUEUE  */

	/*  KEYBOARD Event   SHADOW DOM Event LISTENER -> SHADOW DOM Event HANDLER  */

	function add_keyboard_listener(event_name: SvelthreeSupportedKeyboardEvent): void {
		const parent_state = parent.state()

		if (has_on_directive(event_name, parent)) {
			if (event_not_registered(event_name, used_keyboard_events_on_directive)) {
				const listener_options = get_listener_options_from_modifiers_prop(event_name, user_modifiers_prop)

				set_keyboard_listener(event_name, listener_options, "on_directive")

				register_event(event_name, used_keyboard_events_on_directive)
			} else {
				//console.warn(`'${event_name}' already registered in 'used_pointer_events_on_directive'!`)
			}
		}

		const on_prop_handler: SvelthreeOnPropHandler | undefined = parent_state[`on_${event_name}`]

		if (on_prop_handler) {
			if (event_not_registered(event_name, used_keyboard_events_on_prop)) {
				if (on_prop_is_simple(event_name, parent)) {
					set_modifiers_map_on_prop(event_name, null, user_modifiers_prop, user_modifiers_on_prop)
					const listener_options = get_listener_options_from_modifiers_prop(event_name, user_modifiers_prop)

					set_keyboard_listener(event_name, listener_options, "on_prop")
				} else if (on_prop_is_complex(on_prop_handler)) {
					const modifiers_arr = get_on_prop_modifiers(on_prop_handler)
					set_modifiers_map_on_prop(event_name, modifiers_arr, user_modifiers_prop, user_modifiers_on_prop)

					const listener_options = modifiers_arr
						? get_listener_options_from_modifiers_arr(event_name, modifiers_arr, user_modifiers_prop)
						: null
					set_keyboard_listener(event_name, listener_options, "on_prop")
				} else {
					console.error(
						`SVELTHREE > ${c_name} > add_keyboard_listener : Cannot process 'on_${event_name}' prop, doesn't match required form.`
					)
				}

				register_event(event_name, used_keyboard_events_on_prop)
			} else {
				//console.warn(`'${event_name}' already registered in 'used_pointer_events_on_prop'!`)
			}
		}

		// update used keyboard events
		used_keyboard_events = new Set([...used_keyboard_events_on_directive, ...used_keyboard_events_on_prop])
	}

	function set_keyboard_listener(
		event_name: SvelthreeSupportedKeyboardEvent,
		listener_options: { [key in SupportedAddEventListenerOption]?: boolean } | undefined | null,
		set_by: HandlerSetBy
	) {
		let modifiers_map: UserModifiersMap | undefined = undefined

		if (set_by === "on_prop") {
			modifiers_map = user_modifiers_on_prop
		} else if (set_by === "on_directive") {
			modifiers_map = user_modifiers_prop
		}

		if (modifiers_map?.get(event_name)?.has("self")) {
			// shadow DOM element is directly listening to either `window` or `document` keyboard event -> NOT managed by canvas!

			// listener is added to the corresponding Shadow DOM element.
			// The shadow dom element has to have focus in order to react to keyboard input.
			//  IMPORTANT  MODIFIERS possible! e.g. `preventDefault` modifier will have 'local' effect.
			//  IMPORTANT  This won't work if 'defaultKeyboardEventListenerHost' was set to 'canvas' -->
			let listener: ((evt: KeyboardEvent) => void) | undefined = undefined
			if (set_by === "on_prop") listener = keyboardevents_handler_on_prop
			if (set_by === "on_directive") listener = keyboardevents_handler_on_directive

			// IMPORTANT  this is only possible because shadow DOM element can have focus! + keyboard events are pointer / mouse independant!
			// IMPORTANT  if would e.g. do the same wit wheel event nothing will happen, because we cannot put the pointer over it! focus doesn't matter for wheel events!
			add_shadow_dom_keyboard_listener(event_name, listener_options, listener)
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
				if (set_by === "on_prop" && !remove_canvas_keydown_listener_on_prop)
					add_canvas_keydown_listener_on_prop()
				if (set_by === "on_directive" && !remove_canvas_keydown_listener_on_directive)
					add_canvas_keydown_listener_on_directive()
				break
			case "keyup":
				if (set_by === "on_prop" && !remove_canvas_keyup_listener_on_prop) add_canvas_keyup_listener_on_prop()
				if (set_by === "on_directive" && !remove_canvas_keyup_listener_on_directive)
					add_canvas_keyup_listener_on_directive()
				break
			case "keypress":
				if (set_by === "on_prop" && !remove_canvas_keypress_listener_on_prop)
					add_canvas_keypress_listener_on_prop()
				if (set_by === "on_directive" && !remove_canvas_keypress_listener_on_directive)
					add_canvas_keypress_listener_on_directive()
				break
			default:
				console.error(`SVELTHREE > ${c_name} : Keyboard event '${event_name}' not implemented!`)
				break
		}
	}

	//  KEYBOARD Event   GLOBAL Keyboard Event -> CANVAS Component Keyboard Event  `canvas_keydown` -> `keydown`

	let remove_canvas_keydown_listener_on_prop: (() => void) | undefined
	function add_canvas_keydown_listener_on_prop(): void {
		remove_canvas_keydown_listener_on_prop = canvas_component?.$on("canvas_keydown", (evt: CanvasComponentEvent) =>
			// global keyboard listener -> we cancel nothing! so we can use the standard handler directly!
			keyboardevents_handler(evt.detail.event as KeyboardEvent, null)
		)
	}

	let remove_canvas_keydown_listener_on_directive: (() => void) | undefined
	function add_canvas_keydown_listener_on_directive(): void {
		remove_canvas_keydown_listener_on_directive = canvas_component?.$on(
			"canvas_keydown",
			(evt: CanvasComponentEvent) =>
				// global keyboard listener -> we cancel nothing! so we can use the standard handler directly!
				keyboardevents_handler(evt.detail.event as KeyboardEvent, null)
		)
	}

	//  KEYBOARD Event   GLOBAL Keyboard Event -> CANVAS Component Keyboard Event  `canvas_keyup` -> `keyup`

	let remove_canvas_keyup_listener_on_prop: (() => void) | undefined
	function add_canvas_keyup_listener_on_prop(): void {
		remove_canvas_keyup_listener_on_prop = canvas_component?.$on("canvas_keyup", (evt: CanvasComponentEvent) =>
			// global keyboard listener -> we cancel nothing! so we can use the standard handler directly!
			keyboardevents_handler(evt.detail.event as KeyboardEvent, null)
		)
	}

	let remove_canvas_keyup_listener_on_directive: (() => void) | undefined
	function add_canvas_keyup_listener_on_directive(): void {
		remove_canvas_keyup_listener_on_directive = canvas_component?.$on("canvas_keyup", (evt: CanvasComponentEvent) =>
			// global keyboard listener -> we cancel nothing! so we can use the standard handler directly!
			keyboardevents_handler(evt.detail.event as KeyboardEvent, null)
		)
	}

	//  KEYBOARD Event   GLOBAL Keyboard Event -> CANVAS Component Keyboard Event  `canvas_press` -> `keypress`

	let remove_canvas_keypress_listener_on_prop: (() => void) | undefined
	function add_canvas_keypress_listener_on_prop(): void {
		remove_canvas_keypress_listener_on_prop = canvas_component?.$on(
			"canvas_keypress",
			(evt: CanvasComponentEvent) => keyboardevents_handler(evt.detail.event as KeyboardEvent, null)
		)
	}

	let remove_canvas_keypress_listener_on_directive: (() => void) | undefined
	function add_canvas_keypress_listener_on_directive(): void {
		remove_canvas_keypress_listener_on_directive = canvas_component?.$on(
			"canvas_keypress",
			(evt: CanvasComponentEvent) => keyboardevents_handler(evt.detail.event as KeyboardEvent, null)
		)
	}

	/*  KEYBOARD Event   DISPATCH Component Event IMMEDIATELY / QUEUE  */

	function keyboardevents_handler_on_prop(evt: KeyboardEvent): void {
		keyboardevents_handler(evt, cancel_or_stop_propagation_on_prop)
	}

	function keyboardevents_handler_on_directive(evt: KeyboardEvent): void {
		keyboardevents_handler(evt, cancel_or_stop_propagation_on_directive)
	}

	function keyboardevents_handler(
		evt: KeyboardEvent,
		cancel_or_stop_propagation_fn: typeof cancel_or_stop_propagation_on_prop | null
	): void {
		const render_mode = store?.rendererComponent?.get_mode()

		if (cancel_or_stop_propagation_fn) cancel_or_stop_propagation_fn(evt)

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

	function dispatch_keyboardevent_intersection_indep(evt: KeyboardEvent) {
		const on_prop_name = `on_${evt.type}`

		const detail: SvelthreeKeyboardEventDetail = {
			code: evt.code,
			evt,
			obj,
			comp: parent
		}

		// intersection independent -> no raycaster_data!
		if (has_on_directive(evt.type, parent))
			dispatch_interaction(evt.type as SvelthreeSupportedKeyboardEvent, detail)
		if (has_on_prop(on_prop_name, parent)) call_on_prop_handler(on_prop_name, evt.type, detail)
	}

	// Similar to Pointer Event handling

	//  WHEEL Event  CANVAS Component WHEEL Event -> SHADOW DOM Event  -->  SHADOW DOM Event LISTENER -> SHADOW DOM Event HANDLER  -->  DISPATCH Component Event IMMEDIATELY / QUEUE  //

	function add_wheel_listener(event_name: SvelthreeSupportedWheelEvent): void {
		const parent_state = parent.state()

		if (has_on_directive(event_name, parent)) {
			if (event_not_registered(event_name, used_wheel_events_on_directive)) {
				const listener_options = get_listener_options_from_modifiers_prop(event_name, user_modifiers_prop)

				set_wheel_listener(event_name, listener_options, true, "on_directive")

				register_event(event_name, used_wheel_events_on_directive)
			} else {
				//console.warn(`'${event_name}' already registered in 'used_pointer_events_on_directive'!`)
			}
		}

		const on_prop_handler: SvelthreeOnPropHandler | undefined = parent_state[`on_${event_name}`]

		if (on_prop_handler) {
			if (event_not_registered(event_name, used_wheel_events_on_prop)) {
				if (on_prop_is_simple(event_name, parent)) {
					set_modifiers_map_on_prop(event_name, null, user_modifiers_prop, user_modifiers_on_prop)
					const listener_options = get_listener_options_from_modifiers_prop(event_name, user_modifiers_prop)

					set_wheel_listener(event_name, listener_options, true, "on_prop")
				} else if (on_prop_is_complex(on_prop_handler)) {
					const modifiers_arr = get_on_prop_modifiers(on_prop_handler)
					set_modifiers_map_on_prop(event_name, modifiers_arr, user_modifiers_prop, user_modifiers_on_prop)

					const listener_options = modifiers_arr
						? get_listener_options_from_modifiers_arr(event_name, modifiers_arr, user_modifiers_prop)
						: null
					set_wheel_listener(event_name, listener_options, true, "on_prop")
				} else {
					console.error(
						`SVELTHREE > ${c_name} > add_wheel_listener : Cannot process 'on_${event_name}' prop, doesn't match required form.`
					)
				}

				register_event(event_name, used_wheel_events_on_prop)
			} else {
				//console.warn(`'${event_name}' already registered in 'used_pointer_events_on_prop'!`)
			}
		}

		// update used wheel event
		used_wheel_events = new Set([...used_wheel_events_on_directive, ...used_wheel_events_on_prop])
	}

	function set_wheel_listener(
		event_name: SvelthreeSupportedWheelEvent,
		listener_options: { [key in SupportedAddEventListenerOption]?: boolean } | undefined | null,
		dispatch_via_shadow_dom: boolean,
		set_by: HandlerSetBy
	) {
		let modifiers_map: UserModifiersMap | undefined = undefined

		if (set_by === "on_prop") {
			modifiers_map = user_modifiers_on_prop
		} else if (set_by === "on_directive") {
			modifiers_map = user_modifiers_prop
		}

		// "intersect" modifier -> dispatch wheel event only if pointer intersects the object
		let on_intersect = !!modifiers_map?.get(event_name)?.has("intersect")
		let is_global = !!modifiers_map?.get(event_name)?.has("global")

		let listener: ((evt: WheelEvent) => void) | undefined = undefined
		if (set_by === "on_prop") {
			listener = on_intersect ? wheel_handler_on_prop_intersect : wheel_handler_on_prop
		}
		if (set_by === "on_directive") {
			listener = on_intersect ? wheel_handler_on_directive_intersect : wheel_handler_on_directive
		}

		if (is_global) {
			// always dispatch via shadow DOM element
			if (dispatch_via_shadow_dom) {
				add_shadow_dom_wheel_listener(event_name, listener_options, listener)
			}

			// add listener directly to window or document
			if (listener_options) {
				// trigger listener directly
				//window.addEventListener(event_name, listener as EventListener, listener_options)

				// dispatch via shadow DOM Element
				// TODO  trigger onKeyboardEvent if specified! (like the function in Canvas)
				window.addEventListener(
					event_name,
					(evt: WheelEvent) => {
						// TODO  works, but check -> implement correctly
						//cancel_or_stop_propagation_on_directive(evt)
						check_wheel(evt, on_intersect)
					},
					listener_options
				)
			} else {
				// trigger listener directly
				//window.addEventListener(event_name, listener as EventListener)

				// dispatch via shadow DOM Element
				// TODO  trigger onKeyboardEvent if specified! (like the function in Canvas)
				window.addEventListener(event_name, (evt: WheelEvent) => {
					// TODO  works, but check -> implement correctly
					//cancel_or_stop_propagation_on_directive(evt)
					check_wheel(evt, on_intersect)
				})
			}
		} else {
			// always dispatch via shadow DOM element
			if (dispatch_via_shadow_dom) {
				add_shadow_dom_wheel_listener(event_name, listener_options, listener)
			}
			add_canvas_wheel_listener(event_name, on_intersect)
		}
	}

	function add_shadow_dom_wheel_listener(
		event_name: SvelthreeSupportedInteractionEvent,
		listener_options: { [key in SupportedAddEventListenerOption]?: boolean } | undefined | null,
		listener: ((evt: WheelEvent) => void) | undefined
	): void {
		if (shadow_dom_el && listener) {
			if (listener_options) {
				shadow_dom_el.addEventListener(event_name, listener as EventListener, listener_options)
			} else {
				shadow_dom_el.addEventListener(event_name, listener as EventListener)
			}
		}
	}

	/*  WHEEL Event   CANVAS Component WHEEL Event -> SHADOW DOM Event  */
	/*
        `Canvas` component emits (spreads) internal canvas ( WHEEL ) events to all interactive components.
        Interactive components listen to those internal canvas ( WHEEL ) events and schedule their redispatch via SHADOW DOM:
            - mode `auto`: all internal canvas ( WHEEL ) events get redispatched immediatelly via SHADOW DOM ( any resulting changes will trigger a new render )
            - mode `always`: all internal canvas ( WHEEL ) events get queued / will be redispatched via SHADOW DOM on the next render ( _raf_ )
    */

	function add_canvas_wheel_listener(event_name: SvelthreeSupportedInteractionEvent, on_intersect: boolean): void {
		switch (event_name) {
			case "wheel":
				if (!remove_canvas_wheel_listener) add_canvas_wheelevent_listener(on_intersect)
				break
			default:
				console.error(`SVELTHREE > ${c_name} > Wheel event '${event_name}' not implemented!`)
				break
		}
	}

	//  WHEEL Event   CANVAS Component WHEEL Event -> SHADOW DOM Event  `canvas_wheel` -> `wheel`

	let remove_canvas_wheel_listener: (() => void) | undefined
	function add_canvas_wheelevent_listener(on_intersect: boolean): void {
		remove_canvas_wheel_listener = canvas_component?.$on("canvas_wheel", (evt: { detail: { event: WheelEvent } }) =>
			check_wheel(evt.detail.event, on_intersect)
		)
	}

	/**
	 * - mode `always`: `e` ( _`pointer.event`_ ) is the last `pointermove` event detected / saved by the `Canvas` component.
	 * - mode `auto`: `e` ( _`evt.detail.event`_ ) is the `pointervent` passed as detail of the `canvas_pointermove` event dispatched by the `Canvas` component.
	 */
	function check_wheel(evt: WheelEvent, on_intersect: boolean) {
		if (shadow_dom_el) {
			if (on_intersect) {
				if (raycaster && intersects()) {
					// this is the last chance to use prevent default on the original event!
					// COOL!  this will affect both "global" and "non global" path
					cancel_or_stop_propagation_on_directive(evt)
					// TODO  Does it even make sense to re-dispatch wheel event via shadow DOM?! What's the use case?!
					shadow_dom_el.dispatchEvent(get_wheelevent_modified_clone(evt))
				}
			} else {
				// this is the last chance to use prevent default on the original event!
				// COOL!  this will affect both "global" and "non global" path
				cancel_or_stop_propagation_on_directive(evt)
				// TODO  Does it even make sense to re-dispatch wheel event via shadow DOM?! What's the use case?!
				shadow_dom_el.dispatchEvent(get_wheelevent_modified_clone(evt))
			}
		} else {
			console.error(
				`SVELTHREE > ${c_name} > check_wheel : Cannot dispatch WheelEvent '${evt.type}' via unavailable 'shadow_dom_el'!`,
				{ shadow_dom_el }
			)
		}
	}

	/**
	 *  WHEEL Event  cloning
	 *
	 * Clone original wheel event and re-type it if needed, in order to re-dispatch it via shadow dom.
	 * - 'wheel' -> get's cloned as it is, doesn't get re-typed.
	 *
	 * We need to do this, because we cannot re-dispatch the same wheel event that occured on the <canvas> \
	 * element through some other DOM / shadow DOM element.
	 *
	 */
	function get_wheelevent_modified_clone(evt: WheelEvent, new_type: string | null = null): WheelEvent {
		const event_init: { [key: string]: unknown } = { composed: undefined }

		// we do this because simply spreading the event object -> `{...e}`:
		// "The spread operator only copies an object's own enumerable properties, not properties found higher on the prototype chain."
		// also we cannot simply alter the value of `composed` via the event object like e.g. `evt.composed = false`
		for (const key in evt) {
			if (key !== "path") {
				event_init[key] = evt[key as keyof WheelEvent]
			}
		}

		//  IMPORTANT  Setting `composed` to false:
		// prevents propagation of the event (dispatched via a shadow element) to outer light dom.
		// see: https://developer.mozilla.org/en-US/docs/Web/API/Event/composed
		event_init.composed = false

		const cloned_and_modified_event: WheelEvent = new_type
			? new WheelEvent(new_type, event_init)
			: new WheelEvent(evt.type, event_init)
		return cloned_and_modified_event
	}

	/*  WHEEL Event   DISPATCH Component Event IMMEDIATELY / QUEUE  */

	function wheel_handler_on_prop_intersect(evt: WheelEvent) {
		wheelevent_handler(evt, cancel_or_stop_propagation_on_prop, true)
	}

	function wheel_handler_on_prop(evt: WheelEvent) {
		wheelevent_handler(evt, cancel_or_stop_propagation_on_prop, false)
	}

	function wheel_handler_on_directive_intersect(evt: WheelEvent) {
		wheelevent_handler(evt, cancel_or_stop_propagation_on_directive, true)
	}

	function wheel_handler_on_directive(evt: WheelEvent) {
		wheelevent_handler(evt, cancel_or_stop_propagation_on_directive, false)
	}

	/*  WHEEL Event   GLOBAL Wheel Event -> CANVAS Component Wheel Event  `canvas_wheel` -> `wheel` */

	function wheelevent_handler(
		evt: WheelEvent,
		cancel_or_stop_propagation_fn: typeof cancel_or_stop_propagation_on_prop | null = null,
		on_intersect: boolean
	): void {
		const render_mode = store?.rendererComponent?.get_mode()

		if (cancel_or_stop_propagation_fn) cancel_or_stop_propagation_fn(evt)

		switch (render_mode) {
			case "always": {
				// QUEUED EVENT DISPATCHING: dispatch our custom event / execute handler on next render (raf aligned)
				let queued_wheel_event = undefined
				if (on_intersect) {
					if (raycaster && intersects()) {
						queued_wheel_event = () => dispatch_wheelevent_intersection_dep(evt)
					}
				} else {
					queued_wheel_event = () => dispatch_wheelevent_intersection_indep(evt)
				}
				if (queued_wheel_event) wheel_events_queue.push(queued_wheel_event)
				break
			}
			case "auto": {
				// IMMEDIATE EVENT DISPATCHING (not raf aligned) / any changes will schedule a new render (raf aligned)
				if (on_intersect) {
					if (raycaster && intersects()) {
						dispatch_wheelevent_intersection_dep(evt)
					}
				} else {
					dispatch_wheelevent_intersection_dep(evt)
				}
				break
			}
			default:
				console.error(`SVELTHREE > ${c_name} > wheelevents_handler : no such 'render_mode' -> ${render_mode}!`)
				break
		}
	}

	function dispatch_wheelevent_intersection_dep(evt: WheelEvent) {
		const on_prop_name = `on_${evt.type}`

		const detail: SvelthreeWheelEventDetail = {
			evt,
			obj,
			comp: parent,
			raycaster_data
		}

		// intersection dependent -> has raycaster_data!
		if (has_on_directive(evt.type, parent)) dispatch_interaction(evt.type as SvelthreeSupportedWheelEvent, detail)
		if (has_on_prop(on_prop_name, parent)) call_on_prop_handler(on_prop_name, evt.type, detail)
	}

	function dispatch_wheelevent_intersection_indep(evt: WheelEvent) {
		const on_prop_name = `on_${evt.type}`

		const detail: SvelthreeWheelEventDetail = {
			evt,
			obj,
			comp: parent
		}

		// intersection independent -> no raycaster_data!
		if (has_on_directive(evt.type, parent)) dispatch_interaction(evt.type as SvelthreeSupportedWheelEvent, detail)
		if (has_on_prop(on_prop_name, parent)) call_on_prop_handler(on_prop_name, evt.type, detail)
	}

	/*  CANCEL OR STOP PROPAGATION  */

	// TODO  check the comments below concerning 'default Svelte first' approach, still valid?

	/**
	 * -  IMPORTANT :
	 * `modifiers` prop **affects both** _`on:` directives_ **and** _prop actions_,
	 * but _prop action modifiers_ **do NOT affect** the `modifiers` prop / _`on:` directives_!
	 *
	 * -  IMPORTANT  mode `"always"`:
	 *   calling `evt.preventDefault()` / `evt.stopPropagation()` inside a handler **will have NO effect** ☝️,
	 * because the event was already emitted at some point during the animation, so `evt.preventDefault()` / `evt.stopPropagation()` **HAVE TO**
	 * be set via `modifiers` prop in order to cancel event's default (DOM) action or stop propagation at the exact same moment it occured.
	 *
	 * -  IMPORTANT  mode `"auto"`:
	 *   calling `evt.preventDefault()` inside a handler **will have effect** ☝️, means
	 * `evt.preventDefault()` / `evt.stopPropagation()` **CAN** but **do NOT HAVE TO** be set via `modifiers` prop
	 * in order to cancel event's default (DOM) action or stop propagation at the exact same moment it occured.
	 */
	function cancel_or_stop_propagation_on_prop(evt: PointerEvent | FocusEvent | KeyboardEvent | WheelEvent): void {
		const e_type = evt.type as SvelthreeSupportedInteractionEvent
		if (
			user_modifiers_on_prop.get(e_type)?.has("preventDefault") ||
			user_modifiers_prop.get("all")?.has("preventDefault") ||
			user_modifiers_prop.get(e_type)?.has("preventDefault")
		)
			prevent_default(evt)
		if (
			user_modifiers_on_prop.get(e_type)?.has("stopPropagation") ||
			user_modifiers_prop.get("all")?.has("stopPropagation") ||
			user_modifiers_prop.get(e_type)?.has("stopPropagation")
		)
			stop_propagation(evt)
	}

	function cancel_or_stop_propagation_on_directive(
		evt: PointerEvent | FocusEvent | KeyboardEvent | WheelEvent
	): void {
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

	function prevent_default(evt: PointerEvent | FocusEvent | KeyboardEvent | WheelEvent) {
		if (verbose && log_dev) console.info(...c_dev(c_name, "prevent_default!"))
		evt.preventDefault()
	}

	function stop_propagation(evt: PointerEvent | FocusEvent | KeyboardEvent | WheelEvent) {
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

	// Reactively add / remove pointer listeners, works with e.g. (syntax):

	// programmatically:
	//   - add/re-add: `comp.on("click", do_on_click)`
	//   - disable/remove: `comp.onx("click", onClick)`

	// dom directive:
	//   - add: `<Mesh on:click={do_on_click} />
	//   - disable/remove: `comp.onx("click", do_on_click)` or not adding to dom in the first place

	// 'on_<event_name>'-prop:
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
		if (using_event("click", parent) || parent_state.button || parent_state.link)
			add_pointer_listener("click", true)
		if (using_event("pointerup", parent)) add_pointer_listener("pointerup", true)
		if (using_event("pointerdown", parent)) add_pointer_listener("pointerdown", true)
		//if (using_event("pointerenter")) add_pointer_listener("pointerenter") ->  DEPRECATED  same as 'pointerover'
		//if (using_event("pointerleave")) add_pointer_listener("pointerleave") ->  DEPRECATED  same as 'pointerout'

		// pointer events depending on 'pointermove' listener
		if (using_event("pointerover", parent)) add_pointer_listener("pointerover", true)
		if (using_event("pointerout", parent)) add_pointer_listener("pointerout", true)

		if (using_event("pointermoveover", parent)) add_pointer_listener("pointermoveover", true)
		if (using_event("pointermove", parent)) add_pointer_listener("pointermove", false)

		// DEPRECATED  RECONSIDER  -> do we need / want these / which use cases?
		//if (using_event("gotpointercapture")) add_pointer_listener("gotpointercapture")
		//if (using_event("lostpointercapture")) add_pointer_listener("lostpointercapture")
		//if (using_event("pointercancel")) add_pointer_listener("pointercancel")

		// keyboard events
		if (using_event("keydown", parent)) add_keyboard_listener("keydown")
		if (using_event("keypress", parent)) add_keyboard_listener("keypress")
		if (using_event("keyup", parent)) add_keyboard_listener("keyup")

		// focus events
		if (using_event("focus", parent)) add_focus_listener("focus") // doesn't bubble
		if (using_event("blur", parent)) add_focus_listener("blur") // doesn't bubble
		if (using_event("focusin", parent)) add_focus_listener("focusin") // bubbles
		if (using_event("focusout", parent)) add_focus_listener("focusout") // bubbles

		// wheel event
		if (using_event("wheel", parent)) add_wheel_listener("wheel")

		// --- REMOVE / UNREGISTER UNUSED EVENTS / LISTENERS ---

		if (not_using_event("click", parent) && !parent_state.button && !parent_state.link)
			completely_remove_pointer_listener("click")
		if (not_using_event("pointerup", parent)) completely_remove_pointer_listener("pointerup")
		if (not_using_event("pointerdown", parent)) completely_remove_pointer_listener("pointerdown")
		//if (not_using_event("pointerenter")) completely_remove_pointer_listener("pointerenter") ->  DEPRECATED  same as 'pointerover'
		//if (not_using_event("pointerleave")) completely_remove_pointer_listener("pointerleave") ->  DEPRECATED  same as 'pointerover'

		// pointer events depending on 'pointermove' listener
		if (not_using_event("pointerover", parent)) completely_remove_pointer_listener("pointerover")
		if (not_using_event("pointerout", parent)) completely_remove_pointer_listener("pointerout")
		if (not_using_event("pointermoveover", parent)) completely_remove_pointer_listener("pointermoveover")

		if (not_using_event("pointermove", parent)) completely_remove_pointer_listener("pointermove")

		// DEPRECATED  RECONSIDER  -> do we need / want these / which use cases?
		//if (not_using_event("gotpointercapture")) completely_remove_pointer_listener("gotpointercapture")
		//if (not_using_event("lostpointercapture")) completely_remove_pointer_listener("lostpointercapture")
		//if (not_using_event("pointercancel")) completely_remove_pointer_listener("pointercancel")

		// keyboard events (listener added to window)
		if (not_using_event("keydown", parent)) completely_remove_keyboard_listener("keydown")
		if (not_using_event("keypress", parent)) completely_remove_keyboard_listener("keypress")
		if (not_using_event("keyup", parent)) completely_remove_keyboard_listener("keyup")

		// focus events
		if (not_using_event("focus", parent)) completely_remove_focus_listener("focus")
		if (not_using_event("blur", parent)) completely_remove_focus_listener("blur")
		if (not_using_event("focusin", parent)) completely_remove_focus_listener("focusin")
		if (not_using_event("focusout", parent)) completely_remove_focus_listener("focusout")

		// wheel event
		if (not_using_event("wheel", parent)) completely_remove_focus_listener("wheel")

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

				// register specific events on the <canvas> element (some pointer, all keyboard events and wheel event)
				switch (event_name) {
					case "click":
					case "pointerdown":
					case "pointerup":
					case "keydown":
					case "keyup":
					case "keypress":
					case "wheel":
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

			remove_all_wheel_listeners()
			wheel_events_queue.length = 0
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

	function remove_all_wheel_listeners(): void {
		for (let i = 0; i < WHEEL_EVENTS.length; i++) {
			completely_remove_wheel_listener(WHEEL_EVENTS[i])
		}
	}

	function completely_remove_keyboard_listener(event_name: SvelthreeSupportedInteractionEvent): void {
		if (event_is_registered(event_name, used_keyboard_events)) {
			switch (event_name) {
				case "keydown":
					if (remove_canvas_keydown_listener_on_prop) remove_canvas_keydown_listener_on_prop()
					if (remove_canvas_keydown_listener_on_directive) remove_canvas_keydown_listener_on_directive()
					break
				case "keyup":
					if (remove_canvas_keyup_listener_on_prop) remove_canvas_keyup_listener_on_prop()
					if (remove_canvas_keyup_listener_on_directive) remove_canvas_keyup_listener_on_directive()
					break
				case "keypress":
					if (remove_canvas_keypress_listener_on_prop) remove_canvas_keypress_listener_on_prop()
					if (remove_canvas_keypress_listener_on_directive) remove_canvas_keypress_listener_on_directive()
					break
				default:
					console.error(
						`SVELTHREE > ${c_name} > completely_remove_keyboard_listener : Keyboard event '${event_name}' not implemented!`
					)
					break
			}

			if (shadow_dom_el) {
				shadow_dom_el.removeEventListener(event_name, keyboardevents_handler_on_prop as EventListener, false)
				shadow_dom_el.removeEventListener(event_name, keyboardevents_handler_on_prop as EventListener, true)
				shadow_dom_el.removeEventListener(
					event_name,
					keyboardevents_handler_on_directive as EventListener,
					false
				)
				shadow_dom_el.removeEventListener(
					event_name,
					keyboardevents_handler_on_directive as EventListener,
					true
				)
			} else {
				console.error(
					`SVELTHREE > ${c_name} > completely_remove_keyboard_listener : Cannot remove listener from unavailable 'shadow_dom_el'!`,
					{ shadow_dom_el }
				)
			}

			unregister_keyboard_event(event_name)
		}
	}

	function completely_remove_wheel_listener(event_name: SvelthreeSupportedInteractionEvent): void {
		if (event_is_registered(event_name, used_wheel_events)) {
			switch (event_name) {
				case "wheel":
					if (remove_canvas_wheel_listener) remove_canvas_wheel_listener()
					break
				default:
					console.error(
						`SVELTHREE > ${c_name} > completely_remove_wheel_listener : Wheel event '${event_name}' not implemented!`
					)
					break
			}

			if (shadow_dom_el) {
				shadow_dom_el.removeEventListener(event_name, wheel_handler_on_prop as EventListener, false)
				shadow_dom_el.removeEventListener(event_name, wheel_handler_on_prop as EventListener, true)
				shadow_dom_el.removeEventListener(event_name, wheel_handler_on_directive as EventListener, false)
				shadow_dom_el.removeEventListener(event_name, wheel_handler_on_directive as EventListener, true)
				shadow_dom_el.removeEventListener(event_name, wheel_handler_on_prop_intersect as EventListener, false)
				shadow_dom_el.removeEventListener(event_name, wheel_handler_on_prop_intersect as EventListener, true)
				shadow_dom_el.removeEventListener(
					event_name,
					wheel_handler_on_directive_intersect as EventListener,
					false
				)
				shadow_dom_el.removeEventListener(
					event_name,
					wheel_handler_on_directive_intersect as EventListener,
					true
				)
			} else {
				console.error(
					`SVELTHREE > ${c_name} > completely_remove_wheel_listener : Cannot remove listener from unavailable 'shadow_dom_el'!`,
					{ shadow_dom_el }
				)
			}

			unregister_wheel_event(event_name)
		}
	}

	function unregister_keyboard_event(event_name: SvelthreeSupportedInteractionEvent) {
		delete_event_from_set(event_name, used_keyboard_events_on_directive)
		delete_event_from_set(event_name, used_keyboard_events_on_prop)
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

	function unregister_wheel_event(event_name: SvelthreeSupportedInteractionEvent) {
		delete_event_from_set(event_name, used_wheel_events_on_directive)
		delete_event_from_set(event_name, used_wheel_events_on_prop)
		delete_event_from_set(event_name, used_wheel_events)

		if (canvas_component) {
			canvas_component.unregister_canvas_listener(event_name)
		} else {
			console.error(
				`SVELTHREE > ${c_name} > unregister_wheel_event : Cannot unregister '${event_name}' Event on 'Canvas' component, 'canvas_component' not available!`,
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
				shadow_dom_el.removeEventListener(event_name, focusevents_handler_on_prop as EventListener, true)
				shadow_dom_el.removeEventListener(event_name, focusevents_handler_on_prop as EventListener, false)
				shadow_dom_el.removeEventListener(event_name, focusevents_handler_on_directive as EventListener, true)
				shadow_dom_el.removeEventListener(event_name, focusevents_handler_on_directive as EventListener, false)
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
		delete_event_from_set(event_name, used_focus_events_on_directive)
		delete_event_from_set(event_name, used_focus_events_on_prop)
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
				shadow_dom_el.removeEventListener(event_name, pointerevents_handler_on_prop as EventListener, false)
				shadow_dom_el.removeEventListener(event_name, pointerevents_handler_on_prop as EventListener, true)
				shadow_dom_el.removeEventListener(
					event_name,
					pointerevents_handler_on_directive as EventListener,
					false
				)
				shadow_dom_el.removeEventListener(event_name, pointerevents_handler_on_directive as EventListener, true)
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
		delete_event_from_set(event_name, used_pointer_events_on_directive)
		delete_event_from_set(event_name, used_pointer_events_on_prop)
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

	function call_on_prop_handler(on_prop_name: string, e_type: string, detail: SvelthreeInteractionEventDetail) {
		const evt = new CustomEvent(e_type, { detail })
		const parent_state = parent.state()
		const on_prop = parent_state[on_prop_name as keyof typeof parent_state] as unknown

		if (on_prop) {
			if (typeof on_prop === "function") {
				on_prop(evt)
			} else if (Array.isArray(on_prop)) {
				if (typeof on_prop[0] === "function") {
					on_prop[0](evt)
				} else {
					console.error(
						`SVELTHREE > ${c_name} > call_on_prop_handler : provided '${on_prop_name}' prop is not of valid type! First item in the provided Array should be a function!`,
						{ on_prop_name, on_prop }
					)
				}
			} else {
				console.error(
					`SVELTHREE > ${c_name} > call_on_prop_handler : provided '${on_prop_name}' prop is not of valid type!`,
					{ on_prop_name, on_prop }
				)
			}
		} else {
			console.error(`SVELTHREE > ${c_name} > call_on_prop_handler : '${on_prop_name}' prop is not available!`, {
				on_prop_name,
				on_prop
			})
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
