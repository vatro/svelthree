import type {
	SvelthreeInteractableComponent,
	SvelthreePropActionHandler,
	SvelthreeSupportedInteractionEvent
} from "../../types/types-extra.js"

/** If the callbacks array of a certain directive (e.g. `on:click`) is emtpy or all callbacks are nullish, the corresponding event listener (e.g. "click") will be removed. */
export const has_on_directive = (on_directive: string, comp: SvelthreeInteractableComponent): boolean => {
	const has_directive_key: boolean = Object.keys(comp.$$.callbacks).includes(on_directive)
	const directive_callbacks: typeof comp["$$"]["callbacks"][] | null = has_directive_key
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

/** Checks if a `svelthree`-component has `on_<event_name>`action. */
export const has_on_prop = (prop_action: string, comp: SvelthreeInteractableComponent): boolean => {
	const comp_state = comp.state()
	return !!comp_state[prop_action as keyof typeof comp_state]
}

/** Retruns `true` if `on:<event_name>`-directive or `on_<event_name>`-action was defined on a `svelthree`-component. */
export const using_event = (
	event_name: SvelthreeSupportedInteractionEvent,
	comp: SvelthreeInteractableComponent
): boolean => {
	const comp_state = comp.state()
	return has_on_directive(event_name, comp) || !!comp_state[`on_${event_name}`]
}

/** Retruns `true` if none of both `on:<event_name>`-directive and `on_<event_name>`-action was defined on a `svelthree`-component. */
export const not_using_event = (
	event_name: SvelthreeSupportedInteractionEvent,
	comp: SvelthreeInteractableComponent
): boolean => {
	const comp_state = comp.state()
	return !has_on_directive(event_name, comp) && !comp_state[`on_${event_name}`]
}

/** Retruns `true` if `svelthree`-component's `on_<event_name>`-action was defined as a simple callback-function (not Array, no `modifiers`-Array). */
export const prop_action_is_simple = (
	event_name: SvelthreeSupportedInteractionEvent,
	comp: SvelthreeInteractableComponent
): boolean => {
	const comp_state = comp.state()
	return typeof comp_state[`on_${event_name}`] === "function"
}

/** Retruns `true` if `svelthree`-component's `on_<event_name>`-action was defined as an Array with a callback-function as first item. */
// TODO  make the check more precise and log errors.
export const prop_action_is_complex = (prop_action_handler: SvelthreePropActionHandler): boolean => {
	return (
		!!(prop_action_handler as Array<unknown>).length &&
		!!(typeof (prop_action_handler as Array<unknown>)[0] === "function")
	)
}
