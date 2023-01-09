import type { Writable } from "svelte/store"
import type { SvelthreeShadowDOMElement } from "../../types/types-extra.js"
import { get } from "svelte/store"

/** (_Closure Factory_) Manages / checks / sets the state of `pointer_is_over` / `pointer_is_out` and dispatches a **cloned** `PointerEvent` (`'pointerover'`/`'pointerout'`) via the **shadow DOM element** accordingly. */
export const create_check_pointer_overout = (
	shadow_dom_el: SvelthreeShadowDOMElement | undefined | null,
	intersects: () => boolean,
	used_pointer_events: Set<string>,
	fn_clone_evt: (evt: PointerEvent, new_type: string | null) => PointerEvent,
	c_name: string
) => {
	let pointer_is_over = false
	let pointer_is_out = true

	return (evt: PointerEvent) => {
		if (shadow_dom_el) {
			if (intersects()) {
				if (!pointer_is_over) {
					pointer_is_over = true
					pointer_is_out = false

					if (used_pointer_events.has("pointerover")) {
						//	shadow_dom_el.dispatchEvent(get_pointerevent_modified_clone(evt, "pointerover"))
						shadow_dom_el.dispatchEvent(fn_clone_evt(evt, "pointerover"))
					}
				}
			} else {
				if (!pointer_is_out) {
					pointer_is_out = true
					pointer_is_over = false

					if (used_pointer_events.has("pointerout")) {
						shadow_dom_el.dispatchEvent(fn_clone_evt(evt, "pointerout"))
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
}

/** (_Closure Factory_) Manages / checks if pointer has moved over the object and dispatches a **cloned** `PointerEvent` (`'pointermoveover'`) via the **shadow DOM element** accordingly. */
export const create_check_pointer_moveover = (
	shadow_dom_el: SvelthreeShadowDOMElement | undefined | null,
	pointer_over_canvas: Writable<{ status: boolean }>,
	intersects: () => boolean,
	used_pointer_events: Set<string>,
	fn_clone_evt: (evt: PointerEvent, new_type: string | null) => PointerEvent,
	c_name: string
) => {
	const last_pointer_moveover: {
		clientX: number | undefined
		clientY: number | undefined
	} = {
		clientX: undefined,
		clientY: undefined
	}

	const pointer_has_not_moved_moveover = (evt: PointerEvent): boolean => {
		return last_pointer_moveover.clientX === evt.clientX && last_pointer_moveover.clientY === evt.clientY
	}

	return (evt: PointerEvent) => {
		//  IMPORTANT  -> `pointermoveover` is not a standard DOM event, so it will not bubble up back to the `<canvas>` element!
		if (shadow_dom_el) {
			// using `get` -> avoid subscribing to a store inside a closure.
			if (get(pointer_over_canvas).status === true) {
				if (
					intersects() &&
					used_pointer_events.has("pointermoveover") &&
					!pointer_has_not_moved_moveover(evt)
				) {
					// `check_pointer_move` & `check_pointer_moveover` use the same `pointerevent` so we have to separate `last_pointer_...`
					last_pointer_moveover.clientX = evt.clientX
					last_pointer_moveover.clientY = evt.clientY

					// immediatelly dispatch component event via shadow dom element
					shadow_dom_el.dispatchEvent(fn_clone_evt(evt, "pointermoveover"))
				}
			}
		} else {
			console.error(
				`SVELTHREE > ${c_name} > check_pointer_moveover : Cannot dispatch PointerEvent '${evt.type}' via unavailable 'shadow_dom_el'!`,
				{ shadow_dom_el }
			)
		}
	}
}
