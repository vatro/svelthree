import type { Writable } from "svelte/store"
import type { SvelthreeShadowDOMElement } from "../../types/types-extra.js"
import { get } from "svelte/store"

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

	constructor(
		private pointer_over_canvas: Writable<{ status: boolean }>,
		private shadow_dom_el: SvelthreeShadowDOMElement | undefined | null,
		private intersects: () => boolean,
		private used_pointer_events: Set<string>,
		private on_pointer: (
			evt: PointerEvent,
			cancel_or_stop_propagation_fn?:
				| ((evt: PointerEvent | FocusEvent | KeyboardEvent | WheelEvent) => void)
				| null
		) => void,
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
