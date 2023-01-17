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
import { event_not_registered, event_is_registered, register_event, unregister_pointer_event } from "./event_utils.js"
import { get_listener_options_from_modifiers_prop } from "./modifier_utils.js"
import { POINTER_EVENTS } from "../../constants/Interaction.js"

/** **Manages / checks** the state of the **pointer**. Contains methods for conditional **dispatching** of corresponding **cloned** `PointerEvent`s via the **shadow DOM Element** first or via immediate invoking of the `on_pointer`. */
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

	private canvas_pointermove_off: (() => void) | undefined
	private canvas_pointermoveover_off: (() => void) | undefined
	private canvas_pointeroverout_off: (() => void) | undefined
	private canvas_pointerdown_off: (() => void) | undefined
	private canvas_pointerup_off: (() => void) | undefined
	private canvas_click_off: (() => void) | undefined

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
		private c_name: string
	) {}

	/** `PointerEventManager` methods **dispatching** a **cloned** `PointerEvent` via the **Shadow DOM Element** first,
	 * which will then immediatelly invoke `on_pointer`, previously added as a Shadow DOM PointerEvent-**Listener**. */
	public shadow_dom = {
		/** Conditionally dispatch a **cloned** `pointerover` / `pointerout` PointerEvent via the **shadow DOM element**. */
		overout: this.overout.bind(this),
		/** Conditionally dispatch a **cloned** `pointermoveover` PoinerEvent via the **shadow DOM element**. */
		moveover: this.moveover.bind(this),
		/** Conditionally dispatch a **cloned** `pointerdown` PoinerEvent via the **shadow DOM element**. */
		pointerdown: this.pointerdown.bind(this),
		/** Conditionally dispatch a **cloned** `pointerup` PoinerEvent via the **shadow DOM element**. */
		pointerup: this.pointerup.bind(this),
		/** Conditionally dispatch a **cloned** `click` PoinerEvent via the **shadow DOM element**. */
		click: this.click.bind(this)
	}

	/** `PointerEventManager` methods **invoking** `on_pointer` as **Callback immediatelly** (_without dispatching via Shadow DOM Element first_) */
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

		// pointer events depending on 'pointermove' listener
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

		// pointer events depending on 'pointermove' listener
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
	// - if using directives  -> `once` should also be set as standard svelte modifier if set in modifiers-prop
	// -  TODO  / CHECK e.g. `on:click` without callback (forwarding) -> https://svelte.dev/docs#template-syntax-element-directives
	// the component itself should emit the event ... isn't this already like this?
	public add_listener = (event_name: SvelthreeSupportedPointerEvent, dispatch_via_shadow_dom: boolean): void => {
		// IMPORTANT  HACKY but simple: links and buttons are being handled as directives concerning modifiers etc.!
		const parent_state = this.parent.state()
		if (has_on_directive(event_name, this.parent) || parent_state.link || parent_state.button) {
			if (event_not_registered(event_name, this.used_pointer_events)) {
				const listener_options = get_listener_options_from_modifiers_prop(event_name, this.user_modifiers_prop)

				this.set_pointer_listeners(event_name, listener_options, dispatch_via_shadow_dom)

				register_event(event_name, this.used_pointer_events, this.canvas_component)
			} else {
				//console.warn(`'${event_name}' already registered!`)
			}
		}
	}

	private set_pointer_listeners(
		event_name: SvelthreeSupportedPointerEvent,
		listener_options: { [key in SupportedAddEventListenerOption]?: boolean } | undefined | null,
		dispatch_via_shadow_dom: boolean
	) {
		//  IMPORTANT  only `pointermove` event is NOT being re-dispatched via shadow dom!
		if (dispatch_via_shadow_dom) {
			this.add_shadow_dom_pointer_listener(event_name, listener_options, this.on_pointer)
		}

		this.add_canvas_pointer_listener(event_name)
	}

	private add_shadow_dom_pointer_listener(
		event_name: SvelthreeSupportedInteractionEvent,
		listener_options: { [key in SupportedAddEventListenerOption]?: boolean } | undefined | null,
		listener: ((evt: PointerEvent) => void) | undefined
	): void {
		if (this.shadow_dom_el && listener) {
			if (listener_options) {
				this.shadow_dom_el.addEventListener(event_name, listener as EventListener, listener_options)
			} else {
				this.shadow_dom_el.addEventListener(event_name, listener as EventListener)
			}
		}
	}

	/** Pointer events are being provided (re-dispatched) by the Canvas component. */
	private add_canvas_pointer_listener(event_name: SvelthreeSupportedInteractionEvent): void {
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
				console.error(`SVELTHREE > ${this.c_name} > Pointer event '${event_name}' not implemented!`)
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

	/** Removes unused but registered (was used) listener. */
	private remove_listener(event_name: SvelthreeSupportedInteractionEvent): void {
		if (event_is_registered(event_name, this.used_pointer_events)) {
			switch (event_name) {
				case "click":
					if (this.canvas_click_off) this.canvas_click_off()
					break
				case "pointerup":
					if (this.canvas_pointerup_off) this.canvas_pointerup_off()
					break
				case "pointerdown":
					if (this.canvas_pointerdown_off) this.canvas_pointerdown_off()
					break
				case "pointerout":
				case "pointerover":
					if (this.canvas_pointeroverout_off) this.canvas_pointeroverout_off()
					break
				case "pointermoveover":
					if (this.canvas_pointermoveover_off) this.canvas_pointermoveover_off()
					break
				case "pointermove":
					if (this.canvas_pointermove_off) this.canvas_pointermove_off()
					break
				default:
					console.error(
						`SVELTHREE > ${this.c_name} > completely_remove_pointer_listener : Pointer event '${event_name}' not implemented!`
					)
					break
			}

			if (this.shadow_dom_el) {
				this.shadow_dom_el.removeEventListener(event_name, this.on_pointer as EventListener, false)
				this.shadow_dom_el.removeEventListener(event_name, this.on_pointer as EventListener, true)
			} else {
				console.error(
					`SVELTHREE > ${this.c_name} > completely_remove_pointer_listener : Cannot remove '${event_name}' listener from unavailable 'shadow_dom_el'!`,
					{ shadow_dom_el: this.shadow_dom_el }
				)
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

	/** Conditionally dispatches a **cloned** `'pointerover'`/`'pointerout'` PointerEvent via the *Shadow DOM Element**. */
	private overout(evt: PointerEvent) {
		if (this.shadow_dom_el) {
			if (this.intersects()) {
				if (!this.pointer_is_over) {
					this.pointer_is_over = true
					this.pointer_is_out = false

					if (this.used_pointer_events.has("pointerover")) {
						//	shadow_dom_el.dispatchEvent(get_pointerevent_modified_clone(evt, "pointerover"))
						this.shadow_dom_el.dispatchEvent(this.clone_evt(evt, "pointerover"))
					}
				}
			} else {
				if (!this.pointer_is_out) {
					this.pointer_is_out = true
					this.pointer_is_over = false

					if (this.used_pointer_events.has("pointerout")) {
						this.shadow_dom_el.dispatchEvent(this.clone_evt(evt, "pointerout"))
					}
				}
			}
		} else {
			console.error(
				`SVELTHREE > ${this.c_name} > check_pointer_overout : Cannot dispatch PointerEvent '${evt.type}' via unavailable 'shadow_dom_el'!`,
				{ shadow_dom_el: this.shadow_dom_el }
			)
		}
	}

	/**
	 * Conditionally dispatches a **cloned** `'pointermoveover'` PointerEvent via the **shadow DOM element**.
	 * - mode `always`: `evt` ( _`pointer.event`_ ) is the last `pointermove` event detected / saved by the `Canvas` component.
	 * - mode `auto`: `evt` ( _`evt.detail.event`_ ) is the `pointervent` passed as detail of the `canvas_pointermove` event dispatched by the `Canvas` component.
	 */
	private moveover(evt: PointerEvent) {
		//  IMPORTANT  -> `pointermoveover` is not a standard DOM event, so it will not bubble up back to the `<canvas>` element!
		if (this.shadow_dom_el) {
			// using `get` -> avoid subscribing to a store inside a closure.
			if (get(this.pointer_over_canvas).status === true) {
				if (
					this.intersects() &&
					this.used_pointer_events.has("pointermoveover") &&
					!this.pointer_has_not_moved_moveover(evt)
				) {
					// `check_pointer_move` & `check_pointer_moveover` use the same `pointerevent` so we have to separate `last_pointer_...`
					this.last_pointer_moveover.clientX = evt.clientX
					this.last_pointer_moveover.clientY = evt.clientY

					// immediatelly dispatch component event via shadow dom element
					this.shadow_dom_el.dispatchEvent(this.clone_evt(evt, "pointermoveover"))
				}
			}
		} else {
			console.error(
				`SVELTHREE > ${this.c_name} > check_pointer_moveover : Cannot dispatch PointerEvent '${evt.type}' via unavailable 'shadow_dom_el'!`,
				{ shadow_dom_el: this.shadow_dom_el }
			)
		}
	}

	private pointerdown(evt: PointerEvent) {
		if (this.shadow_dom_el) {
			if (this.intersects()) {
				this.shadow_dom_el.dispatchEvent(this.clone_evt(evt))
			}
		} else {
			console.error(
				`SVELTHREE > ${this.c_name} > check_pointer_pointerdown : Cannot dispatch PointerEvent '${evt.type}' via unavailable 'shadow_dom_el'!`,
				{ shadow_dom_el: this.shadow_dom_el }
			)
		}
	}

	private pointerup(evt: PointerEvent) {
		if (this.shadow_dom_el) {
			if (this.intersects()) {
				this.shadow_dom_el.dispatchEvent(this.clone_evt(evt))
			}
		} else {
			console.error(
				`SVELTHREE > ${this.c_name} > check_pointer_pointerup : Cannot dispatch PointerEvent '${evt.type}' via unavailable 'shadow_dom_el'!`,
				{ shadow_dom_el: this.shadow_dom_el }
			)
		}
	}

	/**
	 * - mode `always`: `e` ( _`pointer.event`_ ) is the last `pointermove` event detected / saved by the `Canvas` component.
	 * - mode `auto`: `e` ( _`evt.detail.event`_ ) is the `pointervent` passed as detail of the `canvas_pointermove` event dispatched by the `Canvas` component.
	 */
	private click(evt: PointerEvent) {
		if (this.shadow_dom_el) {
			if (this.intersects()) {
				this.shadow_dom_el.dispatchEvent(this.clone_evt(evt))
			}
		} else {
			console.error(
				`SVELTHREE > ${this.c_name} > check_pointer_click : Cannot dispatch PointerEvent '${evt.type}' via unavailable 'shadow_dom_el'!`,
				{ shadow_dom_el: this.shadow_dom_el }
			)
		}
	}

	private move(evt: PointerEvent) {
		if (
			this.used_pointer_events.has("pointermove") &&
			get(this.pointer_over_canvas).status === true &&
			!this.pointer_has_not_moved_move(evt)
		) {
			this.last_pointer_move.clientX = evt.clientX
			this.last_pointer_move.clientY = evt.clientY

			// no check, no dispatch via shadow dom but also queued in "always" mode
			this.on_pointer(this.clone_evt(evt), null)
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
	 * Clone original pointer events and re-type them if needed,in order to re-dispatch them via shadow dom.
	 * - 'click' -> get's cloned as it is.
	 * - 'pointerover' and 'pointerout' -> 'pointermove' event gets re-typed to 'pointerover' or 'pointerout'.
	 *
	 * We need to do this, because we cannot re-dispatch the same pointer event that occured on the <canvas>  \
	 * element through some other DOM / shadow DOM element.
	 *
	 */
	clone_evt(evt: PointerEvent, new_type: string | null = null): PointerEvent {
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
}
