import type { Writable } from "svelte/store"
import type {
	CanvasComponentEvent,
	MapPropModifiers,
	SupportedAddEventListenerOption,
	SvelthreeInteractableComponent,
	SvelthreeShadowDOMElement,
	SvelthreeSupportedInteractionEvent,
	SvelthreeSupportedPointerEvent
} from "../../types/types-extra.js"
type CanvasComponent = import("../../components/Canvas.svelte").default
import { get } from "svelte/store"
import { has_on_directive, using_event, not_using_event } from "./parent_comp_utils.js"
import {
	event_not_registered,
	event_is_registered,
	register_event,
	unregister_pointer_event,
	cancel_or_stop_propagation
} from "./event_utils.js"
import { get_listener_options_from_modifiers_prop } from "./modifier_utils.js"
import { DEFAULT_DOM_LISTENER_OPTIONS, POINTER_EVENTS } from "../../constants/Interaction.js"

/** **Manages / checks** the state of the **pointer**. Contains methods for conditional **dispatching** of corresponding **cloned** `PointerEvent`s via the **ShadowDOM-Element** first or via immediate invoking of the `on_pointer`. */
export default class PointerEventManager {
	private pointer_is_over = false
	private pointer_is_out = true

	private last_pointer_moveover: {
		clientX: number | undefined
		clientY: number | undefined
	} = {
		clientX: undefined,
		clientY: undefined
	}

	private last_pointer_move: {
		clientX: number | undefined
		clientY: number | undefined
	} = {
		clientX: undefined,
		clientY: undefined
	}

	private canvas_pointermove_off: (() => void) | undefined | null
	private canvas_pointermoveover_off: (() => void) | undefined | null
	private canvas_pointeroverout_off: (() => void) | undefined | null
	private canvas_pointerdown_off: (() => void) | undefined | null
	private canvas_pointerup_off: (() => void) | undefined | null
	private canvas_click_off: (() => void) | undefined | null

	constructor(
		private pointer_over_canvas: Writable<{ status: boolean }>,
		private shadow_dom_el: SvelthreeShadowDOMElement | undefined | null,
		private intersects: () => boolean,
		private user_modifiers_prop: MapPropModifiers,
		private used_pointer_events: Set<string>,
		private on_pointer: (
			evt: PointerEvent,
			cancel_or_stop_propagation_fn?:
				| ((evt: PointerEvent | FocusEvent | KeyboardEvent | WheelEvent) => void)
				| null
		) => void,
		private parent: SvelthreeInteractableComponent,
		private canvas_component: CanvasComponent | undefined,
		private shadow_dom_enabled: boolean | undefined,
		private c_name: string
	) {}

	/** `PointerEventManager` methods that CAN ( TODO  -> if `useShadowDom === `true`) **dispatch** a **cloned** `PointerEvent` via the **ShadowDOM-Element** first,
	 * which will then immediatelly invoke `on_pointer`, previously added as a ShadowDOM-Element PointerEvent-**Listener** ( TODO  -> if `useShadowDom === `true`). */
	public shadow_dom = {
		/** Conditionally dispatch a **cloned** `pointerover` / `pointerout` PointerEvent via the **ShadowDOM-Element**. */
		overout: this.overout.bind(this),
		/** Conditionally dispatch a **cloned** `pointermoveover` PoinerEvent via the **ShadowDOM-Element**. */
		moveover: this.moveover.bind(this),
		/** Conditionally dispatch a **cloned** `pointerdown` PoinerEvent via the **ShadowDOM-Element**. */
		pointerdown: this.pointerdown.bind(this),
		/** Conditionally dispatch a **cloned** `pointerup` PoinerEvent via the **ShadowDOM-Element**. */
		pointerup: this.pointerup.bind(this),
		/** Conditionally dispatch a **cloned** `click` PoinerEvent via the **ShadowDOM-Element**. */
		click: this.click.bind(this)
	}

	/** `PointerEventManager` methods **invoking** `on_pointer` as **callback immediatelly** (_without dispatching via ShadowDOM-Element first_) */
	public callback = {
		move: this.move.bind(this)
	}

	// --- LISTENERS ---

	public check_adding_listeners() {
		const parent_state = this.parent.state()
		// will be queued in mode "always"
		// will be dispatsched immediately in mode "auto" -> see 'on_pointer'
		if (using_event("click", this.parent) || parent_state.button || parent_state.link)
			this.add_listener("click", true)
		if (using_event("pointerup", this.parent)) this.add_listener("pointerup", true)
		if (using_event("pointerdown", this.parent)) this.add_listener("pointerdown", true)
		//if (using_event("pointerenter")) add_pointer_listener("pointerenter") ->  DEPRECATED  same as 'pointerover'
		//if (using_event("pointerleave")) add_pointer_listener("pointerleave") ->  DEPRECATED  same as 'pointerout'

		// pointer events depending on 'pointermove' Listener
		if (using_event("pointerover", this.parent)) this.add_listener("pointerover", true)
		if (using_event("pointerout", this.parent)) this.add_listener("pointerout", true)

		if (using_event("pointermoveover", this.parent)) this.add_listener("pointermoveover", true)
		if (using_event("pointermove", this.parent)) this.add_listener("pointermove", false)

		// DEPRECATED  RECONSIDER  -> do we need / want these / which use cases?
		//if (using_event("gotpointercapture")) add_pointer_listener("gotpointercapture")
		//if (using_event("lostpointercapture")) add_pointer_listener("lostpointercapture")
		//if (using_event("pointercancel")) add_pointer_listener("pointercancel")
	}

	public check_removing_listeners() {
		const parent_state = this.parent.state()
		if (not_using_event("click", this.parent) && !parent_state.button && !parent_state.link)
			this.remove_listener("click")
		if (not_using_event("pointerup", this.parent)) this.remove_listener("pointerup")
		if (not_using_event("pointerdown", this.parent)) this.remove_listener("pointerdown")
		//if (not_using_event("pointerenter")) completely_remove_pointer_listener("pointerenter") ->  DEPRECATED  same as 'pointerover'
		//if (not_using_event("pointerleave")) completely_remove_pointer_listener("pointerleave") ->  DEPRECATED  same as 'pointerover'

		// pointer events depending on 'pointermove' Listener
		if (not_using_event("pointerover", this.parent)) this.remove_listener("pointerover")
		if (not_using_event("pointerout", this.parent)) this.remove_listener("pointerout")
		if (not_using_event("pointermoveover", this.parent)) this.remove_listener("pointermoveover")

		if (not_using_event("pointermove", this.parent)) this.remove_listener("pointermove")

		// DEPRECATED  RECONSIDER  -> do we need / want these / which use cases?
		//if (not_using_event("gotpointercapture")) completely_remove_pointer_listener("gotpointercapture")
		//if (not_using_event("lostpointercapture")) completely_remove_pointer_listener("lostpointercapture")
		//if (not_using_event("pointercancel")) completely_remove_pointer_listener("pointercancel")
	}

	// IMPORTANT  LIMITATIONS:
	// -  TOFIX  / CHECK (is this inevitable?): `once` should also be set as standard svelte modifier if set in modifiers-prop
	// -  TODO  / CHECK e.g. `on:click` without callback (forwarding) -> https://svelte.dev/docs#template-syntax-element-directives
	// the component itself should emit the Event ... isn't this already like this?
	public add_listener = (event_name: SvelthreeSupportedPointerEvent, dispatch_via_shadow_dom: boolean): void => {
		// IMPORTANT  HACKY but simple: links and buttons are being handled as directives concerning modifiers etc.!
		const parent_state = this.parent.state()
		if (has_on_directive(event_name, this.parent) || parent_state.link || parent_state.button) {
			if (event_not_registered(event_name, this.used_pointer_events)) {
				const listener_options =
					get_listener_options_from_modifiers_prop(event_name, this.user_modifiers_prop) ||
					DEFAULT_DOM_LISTENER_OPTIONS
				this.set_listeners(event_name, listener_options, dispatch_via_shadow_dom)

				register_event(event_name, this.used_pointer_events, this.canvas_component)
			} else {
				//console.warn(`'${event_name}' already registered!`)
			}
		}
	}

	private set_listeners(
		event_name: SvelthreeSupportedPointerEvent,
		listener_options: { [key in SupportedAddEventListenerOption]?: boolean },
		dispatch_via_shadow_dom: boolean
	) {
		//  IMPORTANT  only `pointermove` Event is NOT being re-dispatched via shadow dom!
		if (this.shadow_dom_enabled && dispatch_via_shadow_dom) {
			this.add_shadow_dom_listener(event_name, listener_options, this.on_pointer)
		}

		this.add_canvas_listener(event_name)
	}

	private add_shadow_dom_listener(
		event_name: SvelthreeSupportedInteractionEvent,
		listener_options: { [key in SupportedAddEventListenerOption]?: boolean },
		listener: ((evt: PointerEvent) => void) | undefined
	): void {
		if (this.shadow_dom_el) {
			if (listener) {
				this.shadow_dom_el.addEventListener(event_name, listener as EventListener, listener_options)
			} else {
				console.error(
					`SVELTHREE > ${this.c_name} > PointerEventManager > add_shadow_dom_listener : Cannot add 'PointerEvent' ShadowDOM-Listener, Listener not available!`,
					{ listener }
				)
			}
		} else {
			console.error(
				`SVELTHREE > ${this.c_name} > PointerEventManager > add_shadow_dom_listener : Cannot add 'PointerEvent' ShadowDOM-Listener, ShadowDOM-Element not available!`,
				{ shadow_dom_enabled: this.shadow_dom_enabled, shadow_dom_el: this.shadow_dom_el }
			)
		}
	}

	/** Listen to internal `PointerEvent` related Events dispatched by the `Canvas` component. */
	private add_canvas_listener(event_name: SvelthreeSupportedInteractionEvent): void {
		switch (event_name) {
			case "click":
				if (!this.canvas_click_off) this.canvas_click_on()
				break
			case "pointerup":
				if (!this.canvas_pointerup_off) this.canvas_pointerup_on()
				break
			case "pointerdown":
				if (!this.canvas_pointerdown_off) this.canvas_pointerdown_on()
				break
			case "pointerout":
			case "pointerover":
				if (!this.canvas_pointeroverout_off) this.canvas_pointeroverout_on()
				break
			case "pointermoveover":
				if (!this.canvas_pointermoveover_off) this.canvas_pointermoveover_on()
				break
			case "pointermove":
				if (!this.canvas_pointermove_off) this.canvas_pointermove_on()
				break
			default:
				console.error(
					`SVELTHREE > ${this.c_name} > PointerEventManager > add_canvas_listener : PointerEvent '${event_name}' not implemented!`
				)
				break
		}
	}

	private canvas_pointermove_on(): void {
		this.canvas_pointermove_off = this.canvas_component?.$on("canvas_pointermove", (evt: CanvasComponentEvent) =>
			this.callback.move(evt.detail.event as PointerEvent)
		)
	}

	private canvas_pointermoveover_on(): void {
		this.canvas_pointermoveover_off = this.canvas_component?.$on(
			"canvas_pointermove",
			(evt: CanvasComponentEvent) => this.shadow_dom.moveover(evt.detail.event as PointerEvent)
		)
	}

	private canvas_pointeroverout_on(): void {
		this.canvas_pointeroverout_off = this.canvas_component?.$on("canvas_pointermove", (evt: CanvasComponentEvent) =>
			this.shadow_dom.overout(evt.detail.event as PointerEvent)
		)
	}

	private canvas_pointerdown_on(): void {
		this.canvas_pointerdown_off = this.canvas_component?.$on("canvas_pointerdown", (evt: CanvasComponentEvent) =>
			this.shadow_dom.pointerdown(evt.detail.event as PointerEvent)
		)
	}

	private canvas_pointerup_on(): void {
		this.canvas_pointerup_off = this.canvas_component?.$on("canvas_pointerup", (evt: CanvasComponentEvent) =>
			this.shadow_dom.pointerup(evt.detail.event as PointerEvent)
		)
	}

	private canvas_click_on(): void {
		this.canvas_click_off = this.canvas_component?.$on("canvas_click", (evt: CanvasComponentEvent) =>
			this.shadow_dom.click(evt.detail.event as PointerEvent)
		)
	}

	/** Removes unused but registered (was used) Listener. */
	private remove_listener(event_name: SvelthreeSupportedInteractionEvent): void {
		if (event_is_registered(event_name, this.used_pointer_events)) {
			switch (event_name) {
				case "click":
					if (this.canvas_click_off) {
						this.canvas_click_off()
						this.canvas_click_off = null
					}
					break
				case "pointerup":
					if (this.canvas_pointerup_off) {
						this.canvas_pointerup_off()
						this.canvas_pointerup_off = null
					}
					break
				case "pointerdown":
					if (this.canvas_pointerdown_off) {
						this.canvas_pointerdown_off()
						this.canvas_pointerdown_off = null
					}
					break
				case "pointerout":
				case "pointerover":
					if (this.canvas_pointeroverout_off) {
						this.canvas_pointeroverout_off()
						this.canvas_pointeroverout_off = null
					}
					break
				case "pointermoveover":
					if (this.canvas_pointermoveover_off) {
						this.canvas_pointermoveover_off()
						this.canvas_pointermoveover_off = null
					}
					break
				case "pointermove":
					if (this.canvas_pointermove_off) {
						this.canvas_pointermove_off()
						this.canvas_pointermove_off = null
					}
					break
				default:
					console.error(
						`SVELTHREE > ${this.c_name} > PointerEventManager > completely_remove_pointer_listener : PointerEvent '${event_name}' not implemented!`
					)
					break
			}

			if (this.shadow_dom_enabled) {
				if (this.shadow_dom_el) {
					this.shadow_dom_el.removeEventListener(event_name, this.on_pointer as EventListener, false)
					this.shadow_dom_el.removeEventListener(event_name, this.on_pointer as EventListener, true)
				} else {
					console.error(
						`SVELTHREE > ${this.c_name} > PointerEventManager > completely_remove_pointer_listener : Cannot remove '${event_name}' Listener from unavailable 'shadow_dom_el'!`,
						{ shadow_dom_el: this.shadow_dom_el }
					)
				}
			}

			unregister_pointer_event(event_name, this.used_pointer_events, this.canvas_component)
		}
	}

	public remove_all_listeners(): void {
		for (let i = 0; i < POINTER_EVENTS.length; i++) {
			this.remove_listener(POINTER_EVENTS[i])
		}
	}

	// --- DISPATCH / PRE-DISPATCH LOGIC ---

	/**
	 * - `shadow_dom_enabled: true` (_`shadow_dom_el` should be available_) -> Dispatch via ShadowDOM-Element first (_invoke `on_pointer` as Listener_)
	 * - `shadow_dom_enabled: false` (_`shadow_dom_el` should not be available_) -> Invoke `on_pointer` immediatelly.
	 *
	 * Events that need to be **cloned** / will be **synthetic**:
	 * - Generally any Events dispatched via the ShadowDOM-Element.
	 * - All `pointermove`-**dependant** Events: `pointerover` / `pointerout` and `pointermoveover`,
	 * the `pointermove`Event itself will **always** be the **original** Event.
	 */
	private hybrid_dispatch(evt: PointerEvent, clone_type?: string) {
		if (this.shadow_dom_enabled) {
			// always cloned event
			this.dispatch_via_shadow_dom(evt, clone_type)
		} else {
			if (clone_type) {
				// *** Canceling has to happen on original Event before cloning. ***
				// All synthetic Events have `isTrusted: false`, means they'll not trigger default actions anyway.
				// If we don't cancel the original Event here, the default action will still be triggered (by the original Event).

				// *** What about render-mode `auto` / `always` differencies? ***
				// There are NO differencies! `on_pointer` does:
				// - `mode: always` -> wraps ANY Event received in a function and puts it in the queue
				// - `mode: auto` -> processes ANY Event received immediatelly

				// apply any `preventDefault` and/or `stopPropagation` modifiers before cloning the Event.
				cancel_or_stop_propagation(evt, this.user_modifiers_prop)

				const cloned_evt: PointerEvent = this.clone_evt(evt, clone_type)
				this.on_pointer(cloned_evt)
			} else {
				// apply any `preventDefault` and/or `stopPropagation` modifiers
				cancel_or_stop_propagation(evt, this.user_modifiers_prop)

				// process original event
				this.on_pointer(evt)
			}
		}
	}

	/** Events dispatched via ShadowDOM-Element need to be cloned. */
	private dispatch_via_shadow_dom(evt: PointerEvent, clone_type?: string) {
		if (this.shadow_dom_el) {
			// apply any `preventDefault` and/or `stopPropagation` modifiers before cloning the Event.
			cancel_or_stop_propagation(evt, this.user_modifiers_prop)

			// Events dispatched via ShadowDOM-Element need to be cloned.
			const cloned_evt: PointerEvent = clone_type ? this.clone_evt(evt, clone_type) : this.clone_evt(evt)
			this.shadow_dom_el.dispatchEvent(cloned_evt)
		} else {
			console.error(
				`SVELTHREE > ${this.c_name} > PointerEventManager > dispatch_via_shadow_dom : Cannot dispatch PointerEvent '${evt.type}' via unavailable 'shadow_dom_el'!`,
				{ shadow_dom_enabled: this.shadow_dom_enabled, shadow_dom_el: this.shadow_dom_el }
			)
		}
	}

	/** Conditionally dispatches a 'pointerover'`/`'pointerout'` PointerEvent -> _`'canvas_pointermove'` dependant_.
	 * - mode `always`: `evt` ( _`pointer.event`_ ) is the last `pointermove` Event detected / saved by the `Canvas` component, see `SvelthreeInteraction.add_interaction_2_listener`.
	 * - mode `auto`: `evt` ( _`evt.detail.event`_ ) is the `pointervent` passed as detail of the `canvas_pointermove` Event dispatched by the `Canvas` component.
	 */
	private overout(evt: PointerEvent) {
		if (this.intersects()) {
			if (!this.pointer_is_over) {
				const search_type = "pointerover"
				const clone_type = search_type

				this.pointer_is_over = true
				this.pointer_is_out = false

				if (this.used_pointer_events.has(search_type)) {
					this.hybrid_dispatch(evt, clone_type)
				}
			}
		} else {
			if (!this.pointer_is_out) {
				const search_type = "pointerout"
				const clone_type = search_type

				this.pointer_is_out = true
				this.pointer_is_over = false

				if (this.used_pointer_events.has(search_type)) {
					this.hybrid_dispatch(evt, clone_type)
				}
			}
		}
	}

	/**
	 * Conditionally dispatches a `'pointermoveover'` PointerEvent -> _`'canvas_pointermove'` dependant_.
	 * - mode `always`: `evt` ( _`pointer.event`_ ) is the last `pointermove` Event detected / saved by the `Canvas` component, see `SvelthreeInteraction.add_interaction_2_listener`.
	 * - mode `auto`: `evt` ( _`evt.detail.event`_ ) is the `pointervent` passed as detail of the `canvas_pointermove` Event dispatched by the `Canvas` component.
	 */
	private moveover(evt: PointerEvent) {
		//  IMPORTANT  -> `pointermoveover` is not a standard DOM event, so it will not bubble up back to the `<canvas>` element!

		// using `get` -> avoid subscribing
		if (get(this.pointer_over_canvas).status === true) {
			const search_type = "pointermoveover"
			const clone_type = search_type

			if (
				this.intersects() &&
				this.used_pointer_events.has(search_type) &&
				!this.pointer_has_not_moved_moveover(evt)
			) {
				// `check_pointer_move` & `check_pointer_moveover` use the same `pointerevent` so we have to separate `last_pointer_...`
				this.last_pointer_moveover.clientX = evt.clientX
				this.last_pointer_moveover.clientY = evt.clientY

				this.hybrid_dispatch(evt, clone_type)
			}
		}
	}

	private pointerdown(evt: PointerEvent) {
		if (this.intersects()) this.hybrid_dispatch(evt)
	}

	private pointerup(evt: PointerEvent) {
		if (this.intersects()) this.hybrid_dispatch(evt)
	}

	private click(evt: PointerEvent) {
		if (this.intersects()) this.hybrid_dispatch(evt)
	}

	/** Dispatches a `'pointermove'` PointerEvent -> _`'canvas_pointermove'` dependant_. */
	private move(evt: PointerEvent) {
		if (
			this.used_pointer_events.has("pointermove") &&
			get(this.pointer_over_canvas).status === true &&
			!this.pointer_has_not_moved_move(evt)
		) {
			this.last_pointer_move.clientX = evt.clientX
			this.last_pointer_move.clientY = evt.clientY

			// Cannot be dispatched via ShadowDOM-Element -> immediatelly invoke `on_pointer`.
			this.on_pointer(evt)
		}
	}

	// Utils
	private pointer_has_not_moved_moveover = (evt: PointerEvent): boolean => {
		return this.last_pointer_moveover.clientX === evt.clientX && this.last_pointer_moveover.clientY === evt.clientY
	}

	private pointer_has_not_moved_move(evt: PointerEvent): boolean {
		return this.last_pointer_move.clientX === evt.clientX && this.last_pointer_move.clientY === evt.clientY
	}

	/**
	 * **Clone** original `PointerEvent`s and **re-type** them if needed, in order to dispatch them via ShadowDOM-Element.
	 * - `click` -> **same type**.
	 * - `pointerover`, `pointerout` and `pointermoveover` -> **re-typed** `pointermove`.
	 *
	 * We need to do this, because we cannot re-dispatch the original `PointerEvent` that already occured on the `<canvas>` DOM Element
	 * through some other DOM / ShadowDOM-Element.
	 */
	clone_evt(evt: PointerEvent, new_type: string | null = null): PointerEvent {
		const event_init: { [key: string]: unknown } = { composed: undefined }

		// simply spreading the Event object -> `{...e}` doesn't work:
		// "The spread operator only copies an object's own enumerable properties, not properties found higher on the prototype chain."
		// + we cannot simply alter the value of `composed` via e.g. `evt.composed = false`
		for (const key in evt) {
			if (key !== "path") {
				event_init[key] = evt[key as keyof PointerEvent]
			}
		}

		//  IMPORTANT  Setting `composed` to false:
		// prevents propagation of the Event (dispatched via a ShadowDOM-Element) to outer light dom.
		// see: https://developer.mozilla.org/en-US/docs/Web/API/Event/composed
		event_init.composed = false

		const cloned_and_modified_event: PointerEvent = new_type
			? new PointerEvent(new_type, event_init)
			: new PointerEvent(evt.type, event_init)
		return cloned_and_modified_event
	}
}
