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
	import { c_lc_int, verbose_mode, get_comp_name } from "../utils/SvelthreeLogger.js"
	import type { LogLC } from "../utils/SvelthreeLogger.js"
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
		SvelthreeSupportedWheelEvent,
		SvelthreeWheelEventDetail,
		MapPropModifiers
	} from "../types/types-extra.js"
	import type { Writable } from "svelte/store"
	import { KEYBOARD_EVENTS, WHEEL_EVENTS, DEFAULT_DOM_LISTENER_OPTIONS } from "../constants/Interaction.js"
	import type {
		SvelthreeSupportedInteractionEvent,
		SupportedAddEventListenerOption,
		SvelthreeModifiersProp,
		SvelthreeSupportedKeyboardEvent,
		SvelthreeSupportedFocusEvent,
		SvelthreeSupportedPointerEvent
	} from "../types/types-extra.js"

	import {
		set_modifiers_map_prop,
		get_listener_options_from_modifiers_prop
	} from "../utils/interaction/modifier_utils.js"

	import { get_intersects_and_set_raycaster_data } from "../utils/interaction/intersection.js"
	import PointerEventManager from "../utils/interaction/PointerEventManager.js"
	import FocusEventManager from "../utils/interaction/FocusEventManager.js"
	import { invoke_queued_events, invoke_last_queued_event } from "../utils/interaction/eventqueue_utils.js"
	import { has_on_directive, using_event, not_using_event } from "../utils/interaction/parent_comp_utils.js"
	import {
		event_not_registered,
		event_is_registered,
		register_event,
		unregister_keyboard_event,
		unregister_wheel_event,
		cancel_or_stop_propagation
	} from "../utils/interaction/event_utils.js"

	/**
	 *  SVELTEKIT  CSR ONLY /
	 * Atm, all logic using 'document' or 'window' is wrapped in an 'if (browser)' check,
	 * and should run on CLIENT ONLY.
	 */
	const browser = !import.meta.env.SSR

	const c_name = get_comp_name(get_current_component())
	const verbose: boolean = verbose_mode()

	export let log_lc: { [P in keyof LogLC]: LogLC[P] } | undefined = undefined

	export let interaction_enabled: boolean | undefined
	export let parent: SvelthreeInteractableComponent
	export let sti: number = getContext("store_index")
	export let obj: Object3D | undefined | null

	const store = $svelthreeStores[sti]

	/** `modifiers` prop of the parent component. */
	export let modifiers: SvelthreeModifiersProp | undefined = undefined
	const user_modifiers_prop: MapPropModifiers = new Map()
	$: if (modifiers) set_modifiers_map_prop(user_modifiers_prop, modifiers)

	let raycaster: Raycaster | undefined
	$: raycaster = store?.raycaster

	/** `parent`-component's `EventDispatcher` dedicated to dispacthing Events managed by the `SvelthreeInteraction` component. */
	export let comp_interaction_dispatcher: SvelthreeInteractionEventDispatcher

	const pointer: PointerState = getContext("pointer")

	const all_intersections: AllIntersections = getContext("all_intersections")
	const raycaster_data: RaycasterData = {}
	const intersects = (): boolean => {
		return get_intersects_and_set_raycaster_data(raycaster, all_intersections, obj, raycaster_data, pointer)
	}

	const canvas_dom: Writable<{ element: HTMLCanvasElement }> = getContext("canvas_dom")
	const pointer_over_canvas: Writable<{ status: boolean }> = getContext("pointer_over_canvas")
	const shadow_dom_enabled: boolean = getContext("shadow_dom_enabled")
	const canvas_component = store?.canvas.svelthreeComponent

	let c: HTMLElement
	$: c = $canvas_dom.element

	export let shadow_dom_el: SvelthreeShadowDOMElement | undefined | null = undefined

	let listeners = false

	// --- Reactively add listeners ---

	$: if (
		c &&
		shadow_dom_enabled === !!shadow_dom_el &&
		raycaster &&
		interaction_enabled &&
		obj &&
		!obj.userData.interact
	) {
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
				m_pointer.shadow_dom.overout(pointer.event)
			}
		}
	}

	// pointer is over / entered the `<canvas>` element.
	$: if (obj?.userData.interact && $pointer_over_canvas.status === true) {
		if (out_of_canvas_triggered) {
			out_of_canvas_triggered = false
		}
	}

	//  POINTER Event  //
	/*
		The `Canvas` component emits (spreads) internal `Canvas`-Events to all interactive components.
		
		Interactive components are listening to those internal (`$on`) `Canvas`-Events and are invoking
		corresponding callbacks (see `PointerEventManager`).
		
		These callbacks control if / when / how the occured PointerEvent will be sent to the `on_pointer`
		function for **final processing** (_queued or immediate dispatching of the component Event via `comp_interaction_dispatcher`_).
		This can happen through (conditional / immediate):

		- Dispatching the (cloned) PointerEvent via the ShadowDOM-Element first (only if `shadow_dom_enabled: true`) -> Listener invokes `on_pointer`.
		- Immediate invoking of the `on_pointer` function (always if `shadow_dom_enabled: false`)

		⚠️ Concerning `preventDefault()` / `stopPropagation()` usage in component Event callbacks (_if not already applied via `modifiers`prop_):

			- render-mode `"always"`:
 				calling `evt.preventDefault()` / `evt.stopPropagation()` inside a component Event callback **will have NO effect**,
				because the event has already been emitted at some point during the animation, so `evt.preventDefault()` / `evt.stopPropagation()` **HAVE TO**
				be set via `modifiers` prop in order to cancel Event's default action or stop Event's propagation at the moment it was emitted / before it was queued.
 
			- render-mode `"auto"`:
				- calling `evt.stopPropagation()` inside a component Event callback **WILL have effect**.
				- calling `evt.preventDefault()` inside a component Event callback **COULD have effect**:

					- `.preventDefault()` will be USELESS if the original Event is synthetic:
						- `pointerover` / `pointerout` and `pointermoveover` (`pointermove`-DEPENDANT) Events are **always** synthetic
						- if `shadow_dom_enabled: true` **all** events will be synthetic (_except the `pointermove` Event which will never be synthetic_)

					- `.preventDefault()` will have effect for the `pointermove` Event (_which will **never** be synthetic_)!

			 IMPORTANT  CONCLUSION:
		 	- ⚠️ render-mode `"always"`: use `modifiers` prop!
			- ⚠️ render-mode `"auto"`: RECOMMENDED: use `modifiers` prop in order to avoid confusion!
  */

	/** A Collection of used `PointerEvent`-names / types -> updated by the `PointerEventManager`. */
	let used_pointer_events = new Set<string>([])

	/**
	 * **Adds / removes** `PointerEvent` related **Listeners** which conditionally:
	 * - **dispatch** a **synthetic** `PointerEvent` via the **ShadowDOM-Element** first -> Listener invokes `on_pointer(evt)` function (_`evt` is **synthetic**_).
	 * - **immediate invoking** of the `on_pointer(evt)` function (_`evt` can be **synthetic** / the **original** Event_).
	 */
	const m_pointer = new PointerEventManager(
		pointer_over_canvas,
		shadow_dom_el,
		intersects,
		user_modifiers_prop,
		used_pointer_events,
		on_pointer,
		parent,
		canvas_component,
		shadow_dom_enabled,
		c_name
	)

	const pointer_events_queue: (() => void)[] = []
	const queued_pointer_move_events: (() => void)[] = []
	const queued_pointer_moveover_events: (() => void)[] = []

	/**
	 * ### +++  POINTER Event   internal callback / Shadow DOM Listener  +++
	 *
	 * ☝️ _How / when this function is being invoked is controlled by the `PointerEventManager`._
	 *
	 * **Manages** Event-**processing** via `comp_interaction_dispatcher`:
	 * - **queued** (`mode: 'always'`) or **immediate** (`mode: 'auto'`)
	 * - **intersection dependant** or **intersection independendant**
	 *
	 * Acts as:
	 * - internal `canvas_component.$on`-**callback**
	 * - ShadowDOM-Event-**Listener**
	 *
	 * ⚠️ `evt` can be a **synthetic** Event or the **original** Event.
	 * In BOTH cases any `preventDefault` / `stopPropagation` modifiers have already been applied (_see `PointerEventManager.hybrid_dispatch(...)`_):
	 * the original Event has been canceled and/or propagation stopped.
	 */
	function on_pointer(evt: PointerEvent): void {
		const render_mode = store?.rendererComponent?.get_mode()

		// TODO  `gotpointercapture`, `lostpointercapture` & `pointercancel` events usage needs to be explored!

		switch (render_mode) {
			case "always":
				// QUEUED COMPONENT EVENT DISPATCHING
				// dispatch `CustomEvent` -> invoke `on:<event_name>`-callback on next render (raf aligned)

				switch (evt.type) {
					case "pointermove": {
						const queued_pointermove_event = () => process_pointerevent_intersection_indep(evt)
						queued_pointer_move_events[0] = queued_pointermove_event
						break
					}
					case "pointermoveover": {
						const queued_pointermoveover_event = () => process_pointerevent_intersection_dep(evt)
						queued_pointer_moveover_events[0] = queued_pointermoveover_event
						break
					}
					default: {
						const queued_pointer_event = () => process_pointerevent_intersection_dep(evt)
						pointer_events_queue.push(queued_pointer_event)
						break
					}
				}

				break
			case "auto":
				// IMMEDIATE COMPONENT EVENT DISPATCHING
				// immediatelly dispatch `CustomEvent` -> invoke `on:<event_name>`-callback immediatelly

				if (evt.type === "pointermove") {
					process_pointerevent_intersection_indep(evt)
				} else {
					process_pointerevent_intersection_dep(evt)
				}

				break
			default:
				console.error(`SVELTHREE > ${c_name} > on_pointer : no such 'render_mode' -> ${render_mode}!`)
				break
		}
	}

	/** intersection dependent -> has raycaster_data! */
	function process_pointerevent_intersection_dep(evt: PointerEvent) {
		const detail: SvelthreePointerEventDetail = {
			evt,
			obj,
			comp: parent,
			raycaster_data
		}

		if (has_on_directive(evt.type, parent))
			comp_interaction_dispatcher(evt.type as SvelthreeSupportedPointerEvent, detail)
	}

	/** intersection independent -> no raycaster_data! */
	function process_pointerevent_intersection_indep(evt: PointerEvent) {
		const detail: SvelthreePointerEventDetail = {
			evt,
			obj,
			comp: parent
		}

		if (has_on_directive(evt.type, parent))
			comp_interaction_dispatcher(evt.type as SvelthreeSupportedPointerEvent, detail)
	}

	//  FOCUS Event  //
	/*
	 ⚠️ `FocusEvent`s will work only if `shadow_dom_enabled: true`, since a `FocusEvent` can only occur on a document-appended DOM-Element.
	*/

	let used_focus_events = new Set<string>([])

	/**
	 * **Adds / removes** the **ShadowDOM**-Event-**Listener** -> _`on_focus(evt)`_ for all `FocusEvent`s.
	 */
	const m_focus = new FocusEventManager(
		shadow_dom_el,
		user_modifiers_prop,
		used_focus_events,
		on_focus,
		parent,
		canvas_component,
		shadow_dom_enabled,
		c_name
	)

	const focus_events_queue: (() => void)[] = []

	/** ### +++  FOCUS Event   Shadow DOM Listener  +++
	 *
	 * ☝️ _How / when this function is being invoked is controlled by the `FocusEventManager`._
	 *
	 * **Manages** Event-**processing** via `comp_interaction_dispatcher`:
	 * - **queued** (`mode: 'always'`) or **immediate** (`mode: 'auto'`)
	 * - `FocusEvent`s are **intersection independendant**
	 *
	 * Acts as:
	 * - **ShadowDOM**-Event-**Listener** **only**
	 *
	 * ⚠️ `evt` is the **original** `FocusEvent`.
	 *
	 */
	function on_focus(evt: FocusEvent): void {
		const render_mode = store?.rendererComponent?.get_mode()

		cancel_or_stop_propagation(evt, user_modifiers_prop)

		switch (render_mode) {
			case "always": {
				// QUEUED COMPONENT EVENT DISPATCHING
				// dispatch `CustomEvent` -> invoke `on:<event_name>`-callback on next render (raf aligned)

				const queued_focus_event = () => process_focusevent_intersection_indep(evt)
				focus_events_queue.push(queued_focus_event)
				break
			}
			case "auto":
				// IMMEDIATE COMPONENT EVENT DISPATCHING
				// immediatelly dispatch `CustomEvent` -> invoke `on:<event_name>`-callback immediatelly

				process_focusevent_intersection_indep(evt)
				break
			default:
				console.error(`SVELTHREE > ${c_name} > on_focus : no such 'render_mode' -> ${render_mode}!`)
				break
		}
	}

	function process_focusevent_intersection_indep(evt: FocusEvent) {
		const detail: SvelthreeFocusEventDetail = {
			evt,
			obj,
			comp: parent
		}

		if (has_on_directive(evt.type, parent))
			comp_interaction_dispatcher(evt.type as SvelthreeSupportedFocusEvent, detail)
	}

	/*  KEYBOARD Event   NATIVE DOM / SHADOW DOM Event  -->  SHADOW DOM Event LISTENER -> SHADOW DOM Event HANDLER  -->  DISPATCH Component Event IMMEDIATELY / QUEUE  */

	/*  KEYBOARD Event   GLOBAL KeyboardEvent -> CANVAS Component KeyboardEvent  -->  DISPATCH Component Event IMMEDIATELY / QUEUE  */

	/*  KEYBOARD Event   SHADOW DOM Event LISTENER -> SHADOW DOM Event HANDLER  */

	const keyboard_events_queue: (() => void)[] = []
	let used_keyboard_events = new Set<string>([])

	function add_keyboard_listener(event_name: SvelthreeSupportedKeyboardEvent): void {
		if (has_on_directive(event_name, parent)) {
			if (event_not_registered(event_name, used_keyboard_events)) {
				const listener_options =
					get_listener_options_from_modifiers_prop(event_name, user_modifiers_prop) ||
					DEFAULT_DOM_LISTENER_OPTIONS

				set_keyboard_listener(event_name, listener_options)

				register_event(event_name, used_keyboard_events, canvas_component)
			} else {
				//console.warn(`'${event_name}' already registered!`)
			}
		}
	}

	function set_keyboard_listener(
		event_name: SvelthreeSupportedKeyboardEvent,
		listener_options: { [key in SupportedAddEventListenerOption]?: boolean }
	) {
		let modifiers_map: MapPropModifiers | undefined = undefined
		modifiers_map = user_modifiers_prop

		if (modifiers_map?.get(event_name)?.has("self")) {
			// ShadowDOM-Element is directly listening to either `window` or `document` keyboard Event -> NOT managed by canvas!

			// Listener is added to the corresponding ShadowDOM-Element.
			// The shadow dom element has to have focus in order to react to keyboard input.
			//  IMPORTANT  MODIFIERS possible! e.g. `preventDefault` modifier will have 'local' effect.
			//  IMPORTANT  This won't work if 'defaultKeyboardEventListenerHost' was set to 'canvas' -->
			//  IMPORTANT  this is only possible because ShadowDOM-Element can have focus! + keyboard events are pointer / mouse independant!
			//  IMPORTANT  if would e.g. do the same wit wheel Event nothing will happen, because we cannot put the pointer over it! focus doesn't matter for wheel events!
			if (shadow_dom_el) {
				add_shadow_dom_keyboard_listener(event_name, listener_options, on_keyboard)
			} else {
				console.error(
					`SVELTHREE > ${c_name} > set_keyboard_listener > Cannot add 'KeyboardEvent' ShadowDOM-Listener (using the 'self'-modifier), ShadowDOM-Element not available!`,
					{ shadow_dom_enabled, shadow_dom_el }
				)
			}
		} else {
			// <canvas> element is listening (listener attached to `window` or `document`) and spreading Keyboard events to all interactive
			// components via an internal event, e.g. `canvas_keydown`, just like pointer events.
			//  IMPORTANT  NO MODIFIERS possible, e.g. `preventDefault()` has to be called from inside some user defined global listener.
			add_canvas_keyboard_listener(event_name)
		}
	}

	function add_shadow_dom_keyboard_listener(
		event_name: SvelthreeSupportedInteractionEvent,
		listener_options: { [key in SupportedAddEventListenerOption]?: boolean },
		listener: ((evt: KeyboardEvent) => void) | undefined
	): void {
		if (shadow_dom_el) {
			if (listener) {
				shadow_dom_el.addEventListener(event_name, listener as EventListener, listener_options)
			} else {
				console.error(
					`SVELTHREE > ${c_name} > add_shadow_dom_keyboard_listener > Cannot add 'KeyboardEvent' ShadowDOM-Listener, Listener not available!`,
					{ listener }
				)
			}
		} else {
			console.error(
				`SVELTHREE > ${c_name} > add_shadow_dom_keyboard_listener > Cannot add 'KeyboardEvent' ShadowDOM-Listener while using the 'self'-modifier, ShadowDOM-Element not available!`,
				{ shadow_dom_enabled, shadow_dom_el }
			)
		}
	}

	/** Keyboard events are also being provided (re-dispatched) by the Canvas component. */
	function add_canvas_keyboard_listener(event_name: SvelthreeSupportedInteractionEvent): void {
		switch (event_name) {
			case "keydown":
				if (!remove_canvas_keydown_listener_on_directive) add_canvas_keydown_listener_on_directive()
				break
			case "keyup":
				if (!remove_canvas_keyup_listener_on_directive) add_canvas_keyup_listener_on_directive()
				break
			case "keypress":
				if (!remove_canvas_keypress_listener_on_directive) add_canvas_keypress_listener_on_directive()
				break
			default:
				console.error(`SVELTHREE > ${c_name} : KeyboardEvent '${event_name}' not implemented!`)
				break
		}
	}

	//  KEYBOARD Event   GLOBAL KeyboardEvent -> CANVAS Component KeyboardEvent  `canvas_keydown` -> `keydown`

	let remove_canvas_keydown_listener_on_directive: (() => void) | undefined
	function add_canvas_keydown_listener_on_directive(): void {
		remove_canvas_keydown_listener_on_directive = canvas_component?.$on(
			"canvas_keydown",
			(evt: CanvasComponentEvent) =>
				// global keyboard Listener -> we cancel nothing! so we can use the standard callback directly!
				on_keyboard(evt.detail.event as KeyboardEvent, false)
		)
	}

	//  KEYBOARD Event   GLOBAL KeyboardEvent -> CANVAS Component KeyboardEvent  `canvas_keyup` -> `keyup`

	let remove_canvas_keyup_listener_on_directive: (() => void) | undefined
	function add_canvas_keyup_listener_on_directive(): void {
		remove_canvas_keyup_listener_on_directive = canvas_component?.$on("canvas_keyup", (evt: CanvasComponentEvent) =>
			// global keyboard Listener -> we cancel nothing! so we can use the standard callback directly!
			on_keyboard(evt.detail.event as KeyboardEvent, false)
		)
	}

	//  KEYBOARD Event   GLOBAL KeyboardEvent -> CANVAS Component KeyboardEvent  `canvas_press` -> `keypress`

	let remove_canvas_keypress_listener_on_directive: (() => void) | undefined
	function add_canvas_keypress_listener_on_directive(): void {
		remove_canvas_keypress_listener_on_directive = canvas_component?.$on(
			"canvas_keypress",
			(evt: CanvasComponentEvent) => on_keyboard(evt.detail.event as KeyboardEvent, false)
		)
	}

	/*  KEYBOARD Event   DISPATCH Component Event IMMEDIATELY / QUEUE  */

	function on_keyboard(evt: KeyboardEvent, can_cancel_or_stop_propagation = true): void {
		const render_mode = store?.rendererComponent?.get_mode()

		if (can_cancel_or_stop_propagation) cancel_or_stop_propagation(evt, user_modifiers_prop)

		switch (render_mode) {
			case "always": {
				// QUEUED EVENT DISPATCHING: dispatch our CustomEvent / invoke callback on next render (raf aligned)
				const queued_keyboard_event = () => process_keyboardevent_intersection_indep(evt)
				keyboard_events_queue.push(queued_keyboard_event)
				break
			}
			case "auto":
				// IMMEDIATE EVENT DISPATCHING (not raf aligned) / any changes will schedule a new render (raf aligned)
				process_keyboardevent_intersection_indep(evt)
				break
			default:
				console.error(`SVELTHREE > ${c_name} > on_keyboard : no such 'render_mode' -> ${render_mode}!`)
				break
		}
	}

	function process_keyboardevent_intersection_indep(evt: KeyboardEvent) {
		const detail: SvelthreeKeyboardEventDetail = {
			code: evt.code,
			evt,
			obj,
			comp: parent
		}

		// intersection independent -> no raycaster_data!
		if (has_on_directive(evt.type, parent))
			comp_interaction_dispatcher(evt.type as SvelthreeSupportedKeyboardEvent, detail)
	}

	// Similar to Pointer Event handling

	//  WHEEL Event  CANVAS Component WHEEL Event -> SHADOW DOM Event  -->  SHADOW DOM Event LISTENER -> SHADOW DOM Event HANDLER  -->  DISPATCH Component Event IMMEDIATELY / QUEUE  //

	const wheel_events_queue: (() => void)[] = []
	let used_wheel_events = new Set<string>([])

	function add_wheel_listener(event_name: SvelthreeSupportedWheelEvent): void {
		if (has_on_directive(event_name, parent)) {
			if (event_not_registered(event_name, used_wheel_events)) {
				const listener_options =
					get_listener_options_from_modifiers_prop(event_name, user_modifiers_prop) ||
					DEFAULT_DOM_LISTENER_OPTIONS

				set_wheel_listener(event_name, listener_options, true)

				register_event(event_name, used_wheel_events, canvas_component)
			} else {
				//console.warn(`'${event_name}' already registered!`)if()
			}
		}
	}

	function set_wheel_listener(
		event_name: SvelthreeSupportedWheelEvent,
		listener_options: { [key in SupportedAddEventListenerOption]?: boolean },
		dispatch_via_shadow_dom: boolean
	) {
		let modifiers_map: MapPropModifiers | undefined = undefined
		modifiers_map = user_modifiers_prop

		// "intersect" modifier -> dispatch wheel Event only if pointer intersects the object
		let on_intersect = !!modifiers_map?.get(event_name)?.has("intersect")
		let is_global = !!modifiers_map?.get(event_name)?.has("global")

		let listener: ((evt: WheelEvent) => void) | undefined = undefined
		listener = on_intersect ? on_wheel_intersection_dep : on_wheel_intersection_indep

		if (is_global) {
			// can be dispatched via ShadowDOM-Element /  TODO  -> always try to dispatch via ShadowDOM-Element?
			if (shadow_dom_enabled && dispatch_via_shadow_dom) {
				add_shadow_dom_wheel_listener(event_name, listener_options, listener)
			}
			// add Listener directly to window or  TODO  -> document
			// can be dispatched via ShadowDOM-Element /  TODO  -> always try to dispatch via ShadowDOM-Element?

			// TODO  trigger onKeyboardEvent if specified! (like the function in Canvas)
			window.addEventListener(
				event_name,
				(evt: WheelEvent) => {
					check_wheel(evt, on_intersect)
				},
				listener_options
			)
		} else {
			// can be dispatched via ShadowDOM-Element /  TODO  -> always try to dispatch via ShadowDOM-Element?
			if (shadow_dom_enabled && dispatch_via_shadow_dom) {
				add_shadow_dom_wheel_listener(event_name, listener_options, listener)
			}
			add_canvas_wheel_listener(event_name, on_intersect)
		}
	}

	function add_shadow_dom_wheel_listener(
		event_name: SvelthreeSupportedInteractionEvent,
		listener_options: { [key in SupportedAddEventListenerOption]?: boolean },
		listener: ((evt: WheelEvent) => void) | undefined
	): void {
		if (shadow_dom_el) {
			if (listener) {
				shadow_dom_el.addEventListener(event_name, listener as EventListener, listener_options)
			} else {
				console.error(
					`SVELTHREE > ${c_name} > add_shadow_dom_wheel_listener > Cannot add 'WheelEvent' ShadowDOM-Listener, Listener not available!`,
					{ listener }
				)
			}
		} else {
			console.error(
				`SVELTHREE > ${c_name} > add_shadow_dom_wheel_listener > Cannot add 'WheelEvent' ShadowDOM-Listener, ShadowDOM-Element not available!`,
				{ shadow_dom_enabled, shadow_dom_el }
			)
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
				console.error(`SVELTHREE > ${c_name} > WheelEvent '${event_name}' not implemented!`)
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
	 * - mode `always`: `e` ( _`pointer.event`_ ) is the last `pointermove` Event detected / saved by the `Canvas` component.
	 * - mode `auto`: `e` ( _`evt.detail.event`_ ) is the `pointervent` passed as detail of the `canvas_pointermove` Event dispatched by the `Canvas` component.
	 */
	function check_wheel(evt: WheelEvent, on_intersect: boolean) {
		// this is the last chance to use prevent default on the original event!
		// COOL!  this will affect both "global" and "non global" path
		cancel_or_stop_propagation(evt, user_modifiers_prop)

		// TODO  Does it even make sense to re-dispatch wheel Event via ShadowDOM-Element?! What's the use case?!
		if (shadow_dom_enabled) {
			if (shadow_dom_el) {
				if (on_intersect) {
					if (raycaster && intersects()) {
						shadow_dom_el.dispatchEvent(get_wheelevent_modified_clone(evt))
					}
				} else {
					shadow_dom_el.dispatchEvent(get_wheelevent_modified_clone(evt))
				}
			} else {
				console.error(
					`SVELTHREE > ${c_name} > check_wheel : Cannot dispatch WheelEvent '${evt.type}' via unavailable 'shadow_dom_el'!`,
					{ shadow_dom_enabled, shadow_dom_el }
				)
			}
		} else {
			if (on_intersect) {
				if (raycaster && intersects()) {
					on_wheel_intersection_dep(evt)
				}
			} else {
				on_wheel_intersection_indep(evt)
			}
		}
	}

	/**
	 *  WHEEL Event  cloning
	 *
	 * Clone original wheel Event and re-type it if needed, in order to re-dispatch it via shadow dom.
	 * - 'wheel' -> get's cloned as it is, doesn't get re-typed.
	 *
	 * We need to do this, because we cannot re-dispatch the same wheel Event that occured on the <canvas> \
	 * element through some other DOM / ShadowDOM-Element.
	 *
	 */
	function get_wheelevent_modified_clone(evt: WheelEvent, new_type: string | null = null): WheelEvent {
		const event_init: { [key: string]: unknown } = { composed: undefined }

		// we do this because simply spreading the Event object -> `{...e}`:
		// "The spread operator only copies an object's own enumerable properties, not properties found higher on the prototype chain."
		// also we cannot simply alter the value of `composed` via the Event object like e.g. `evt.composed = false`
		for (const key in evt) {
			if (key !== "path") {
				event_init[key] = evt[key as keyof WheelEvent]
			}
		}

		//  IMPORTANT  Setting `composed` to false:
		// prevents propagation of the Event (dispatched via a shadow element) to outer light dom.
		// see: https://developer.mozilla.org/en-US/docs/Web/API/Event/composed
		event_init.composed = false

		const cloned_and_modified_event: WheelEvent = new_type
			? new WheelEvent(new_type, event_init)
			: new WheelEvent(evt.type, event_init)
		return cloned_and_modified_event
	}

	/*  WHEEL Event   DISPATCH Component Event IMMEDIATELY / QUEUE  */

	function on_wheel_intersection_dep(evt: WheelEvent) {
		on_wheel(evt, true)
	}

	function on_wheel_intersection_indep(evt: WheelEvent) {
		on_wheel(evt, false)
	}

	/*  WHEEL Event   GLOBAL WheelEvent -> CANVAS Component WheelEvent  `canvas_wheel` -> `wheel` */

	function on_wheel(evt: WheelEvent, on_intersect: boolean): void {
		const render_mode = store?.rendererComponent?.get_mode()

		cancel_or_stop_propagation(evt, user_modifiers_prop)

		switch (render_mode) {
			case "always": {
				// QUEUED EVENT DISPATCHING: dispatch our CustomEvent / invoke callback on next render (raf aligned)
				let queued_wheel_event = undefined
				if (on_intersect) {
					if (raycaster && intersects()) {
						queued_wheel_event = () => process_wheelevent_intersection_dep(evt)
					}
				} else {
					queued_wheel_event = () => process_wheelevent_intersection_indep(evt)
				}
				if (queued_wheel_event) wheel_events_queue.push(queued_wheel_event)
				break
			}
			case "auto": {
				// IMMEDIATE EVENT DISPATCHING (not raf aligned) / any changes will schedule a new render (raf aligned)
				if (on_intersect) {
					if (raycaster && intersects()) {
						process_wheelevent_intersection_dep(evt)
					}
				} else {
					process_wheelevent_intersection_dep(evt)
				}
				break
			}
			default:
				console.error(`SVELTHREE > ${c_name} > on_wheel : no such 'render_mode' -> ${render_mode}!`)
				break
		}
	}

	function process_wheelevent_intersection_dep(evt: WheelEvent) {
		const detail: SvelthreeWheelEventDetail = {
			evt,
			obj,
			comp: parent,
			raycaster_data
		}

		// intersection dependent -> has raycaster_data!
		if (has_on_directive(evt.type, parent))
			comp_interaction_dispatcher(evt.type as SvelthreeSupportedWheelEvent, detail)
	}

	function process_wheelevent_intersection_indep(evt: WheelEvent) {
		const detail: SvelthreeWheelEventDetail = {
			evt,
			obj,
			comp: parent
		}

		// intersection independent -> no raycaster_data!
		if (has_on_directive(evt.type, parent))
			comp_interaction_dispatcher(evt.type as SvelthreeSupportedWheelEvent, detail)
	}

	/*  ADDING AND REGISTERING  */

	/** for `SvelthreeInteraction` component's reactive Listener management only */
	export let update_listeners = false

	let r_added_on_init = false
	// reactive Listener management checks
	$: r_add_on_init = interaction_enabled && listeners
	$: r_remove = !interaction_enabled && listeners

	// Reactively add / remove pointer listeners, works with e.g. (syntax):

	// programmatically:
	//   - add/re-add: `comp.on("click", do_on_click)`
	//   - disable/remove: `comp.onx("click", onClick)`

	// markup `on:`-directive:
	//   - add: `<Mesh on:click={(e) => do_on_click(e)} /> or `<Mesh on:click={do_on_click} />
	//   - disable/remove: `comp.onx("click", do_on_click)` or not adding to the markup in the first place

	// COOL!  Multiple `on:` directives WILL be triggered as expected.

	$: if ((r_add_on_init && !r_added_on_init) || (update_listeners && interaction_enabled)) do_update_listeners()

	const do_update_listeners = () => {
		r_added_on_init = true
		update_listeners = false

		//console.warn("UPDATE LISTENERS!")

		// --- ADD / REGISTER USED EVENTS / LISTENERS ---

		m_pointer.check_adding_listeners()

		// keyboard events
		if (using_event("keydown", parent)) add_keyboard_listener("keydown")
		if (using_event("keypress", parent)) add_keyboard_listener("keypress")
		if (using_event("keyup", parent)) add_keyboard_listener("keyup")

		m_focus.check_adding_listeners()

		// wheel event
		if (using_event("wheel", parent)) add_wheel_listener("wheel")

		// --- REMOVE / UNREGISTER UNUSED EVENTS / LISTENERS ---

		m_pointer.check_removing_listeners()

		// keyboard events (listener added to window)
		if (not_using_event("keydown", parent)) completely_remove_keyboard_listener("keydown")
		if (not_using_event("keypress", parent)) completely_remove_keyboard_listener("keypress")
		if (not_using_event("keyup", parent)) completely_remove_keyboard_listener("keyup")

		m_focus.check_removing_listeners()

		// wheel event
		if (not_using_event("wheel", parent)) completely_remove_wheel_listener("wheel")

		set_block_status()

		if (store) {
			if (store.rendererComponent?.get_mode() === "always" && !remove_interaction_3_listener) {
				add_interaction_3_listener()
			}
		}
	}

	/**
	 * Changes component's `block` status.
	 */
	function set_block_status(): void {
		if (used_pointer_events.size === 0 && (used_wheel_events.size === 0 || has_global_wheel_event())) {
			// cursor will not change even if `Canvas.changeCursor === true`
			parent.$set({ block: true })
			if (store) {
				if (store.rendererComponent?.get_mode() === "always" && remove_interaction_2_listener) {
					remove_interaction_2_listener()
					remove_interaction_2_listener = null
				}
			}
		} else if (used_pointer_events.size > 0 || (used_wheel_events.size > 0 && !has_global_wheel_event())) {
			// cursor will change if `Canvas.changeCursor === true`
			parent.$set({ block: false })
			if (store) {
				if (store.rendererComponent?.get_mode() === "always" && !remove_interaction_2_listener) {
					add_interaction_2_listener()
				}
			}
		}
	}

	//  RENDER EVENT interaction_2  ALWAYS  //
	//  IMPORTANT  In mode `always` ALL component Events are queued!

	let remove_interaction_2_listener: (() => void) | undefined | null

	/**
	 * [ _mode `always` only_ ]
	 * - invoke `pointerover` / `pointerout` events -> even if the pointer is not moving.
	 * - invoke `moveover` events.
	 * - invoke all / any queued `pointer` events ( _raf aligned_ ) on each rendered frame.
	 */
	function add_interaction_2_listener(): void {
		remove_interaction_2_listener = store?.rendererComponent?.$on("interaction_2", () => {
			// Check for `pointerover`/`pointerout` and `moveover` states and queue corresponding
			// events even if the pointer didn't actively move, but the object maybe did.
			// `pointer.event` is / will be the last `pointermove` Event detected.
			if (pointer.event) {
				m_pointer.shadow_dom.overout(pointer.event)
				m_pointer.shadow_dom.moveover(pointer.event)
			}

			// invoke any queued events
			invoke_last_queued_event(queued_pointer_move_events)
			invoke_last_queued_event(queued_pointer_moveover_events)
			invoke_queued_events(pointer_events_queue)
		})
	}

	//  RENDER EVENT interaction_3  ALWAYS  //
	//  IMPORTANT  In mode `always` ALL component Events are queued!

	let remove_interaction_3_listener: (() => void) | undefined | null

	/**
	 * [ _mode `always` only_ ]
	 * Invoke all / any **queued** `focus`, `keyboard` or `wheel` component / shadow dom Events ( _raf aligned_ ) on each rendered frame.
	 */
	function add_interaction_3_listener(): void {
		remove_interaction_3_listener = store?.rendererComponent?.$on("interaction_3", () => {
			invoke_queued_events(focus_events_queue)
			invoke_queued_events(keyboard_events_queue)
			invoke_queued_events(wheel_events_queue)
		})
	}

	function has_global_wheel_event(): boolean {
		let has_global = false

		if (used_wheel_events.size > 0) {
			if (user_modifiers_prop.get("all")?.has("global")) {
				has_global = true
			} else if (user_modifiers_prop.get("wheel")?.has("global")) {
				has_global = true
			}
			return has_global
		} else {
			return false
		}
	}

	/*  REMOVING AND UNREGISTERING  */

	/* reactively removes all listeners if interaction_enabled (interactive && interact) is false */
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

		m_pointer.remove_all_listeners()
		pointer_events_queue.length = 0

		//  SVELTEKIT  CSR ONLY  keyboard Event listeners are being added to `window`.
		if (browser) {
			remove_all_keyboard_listeners()
			keyboard_events_queue.length = 0

			remove_all_wheel_listeners()
			wheel_events_queue.length = 0
		}

		m_focus.remove_all_listeners()
		focus_events_queue.length = 0
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
					if (remove_canvas_keydown_listener_on_directive) remove_canvas_keydown_listener_on_directive()
					break
				case "keyup":
					if (remove_canvas_keyup_listener_on_directive) remove_canvas_keyup_listener_on_directive()
					break
				case "keypress":
					if (remove_canvas_keypress_listener_on_directive) remove_canvas_keypress_listener_on_directive()
					break
				default:
					console.error(
						`SVELTHREE > ${c_name} > completely_remove_keyboard_listener : KeyboardEvent '${event_name}' not implemented!`
					)
					break
			}

			if (shadow_dom_enabled) {
				if (shadow_dom_el) {
					shadow_dom_el.removeEventListener(event_name, on_keyboard as EventListener, false)
					shadow_dom_el.removeEventListener(event_name, on_keyboard as EventListener, true)
				} else {
					console.error(
						`SVELTHREE > ${c_name} > completely_remove_keyboard_listener : Cannot remove Listener from unavailable 'shadow_dom_el'!`,
						{ shadow_dom_el }
					)
				}
			}

			unregister_keyboard_event(event_name, used_keyboard_events, canvas_component)
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
						`SVELTHREE > ${c_name} > completely_remove_wheel_listener : WheelEvent '${event_name}' not implemented!`
					)
					break
			}

			if (shadow_dom_enabled) {
				if (shadow_dom_el) {
					shadow_dom_el.removeEventListener(event_name, on_wheel_intersection_indep as EventListener, false)
					shadow_dom_el.removeEventListener(event_name, on_wheel_intersection_indep as EventListener, true)
					shadow_dom_el.removeEventListener(event_name, on_wheel_intersection_dep as EventListener, false)
					shadow_dom_el.removeEventListener(event_name, on_wheel_intersection_dep as EventListener, true)
				} else {
					console.error(
						`SVELTHREE > ${c_name} > completely_remove_wheel_listener : Cannot remove Listener from unavailable 'shadow_dom_el'!`,
						{ shadow_dom_el }
					)
				}
			}

			unregister_wheel_event(event_name, used_wheel_events, canvas_component)
		}
	}

	// disable interaction (reactive)
	$: if (c && raycaster && !interaction_enabled && obj && obj.userData.interact) {
		remove_all_listeners()
		obj.userData.interact = false
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
