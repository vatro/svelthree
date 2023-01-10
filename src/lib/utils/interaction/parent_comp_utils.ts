import type { SvelthreeInteractableComponent, SvelthreeSupportedInteractionEvent } from "../../types/types-extra.js"

/** If the callbacks array of a certain `on:<event_name>`-directive (e.g. `on:click`) is emtpy or all callbacks are nullish, the corresponding event listener (e.g. "click") will be removed. */
export const has_on_directive = (on_directive: string, comp: SvelthreeInteractableComponent): boolean => {
	const has_on_directive_key: boolean = Object.keys(comp.$$.callbacks).includes(on_directive)
	const directive_callbacks: typeof comp["$$"]["callbacks"][] | null = has_on_directive_key
		? comp.$$.callbacks[on_directive]
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

/** Retruns `true` if `on:<event_name>`-directive was defined on a `svelthree`-component. */
export const using_event = (
	event_name: SvelthreeSupportedInteractionEvent,
	comp: SvelthreeInteractableComponent
): boolean => {
	return has_on_directive(event_name, comp)
}

/** Retruns `true` if no `on:<event_name>`-directive was defined on a `svelthree`-component. */
export const not_using_event = (
	event_name: SvelthreeSupportedInteractionEvent,
	comp: SvelthreeInteractableComponent
): boolean => {
	return !has_on_directive(event_name, comp)
}
