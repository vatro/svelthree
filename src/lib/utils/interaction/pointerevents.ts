import type { SvelthreeShadowDOMElement } from "../../types/types-extra.js"

/** (_Closure_) Manages / checks / sets the state of `pointer_is_over` / `pointer_is_out` and dispatches a **cloned** `PointerEvent` (`'pointerover'`/`'pointerout'`) via the **shadow DOM element** accordingly. */
export const create_check_pointer_overout = (
	shadow_dom_el: SvelthreeShadowDOMElement | undefined | null,
	intersects: () => boolean,
	used_pointer_events: Set<string>,
	fn_clone_evt: (evt: PointerEvent, new_type: string | null) => PointerEvent
) => {
	const c_name = "SvelthreeInteraction"
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
