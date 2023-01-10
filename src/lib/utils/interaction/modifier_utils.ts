import { ADD_EVENT_LISTENER_OPTIONS_SET, ALL_MODIFIERS_SET } from "../../constants/Interaction.js"
import type {
	MapPropModifiers,
	SupportedAddEventListenerOption,
	SvelthreeEventModifier,
	SvelthreeModifiersProp,
	SvelthreeSupportedInteractionEvent
} from "../../types/types-extra.js"

const c_name = "SvelthreeInteraction"

/** Filter out / use only supported modifiers. */
export const get_valid_modifiers_only = (modifiers_arr: string[]): Set<SvelthreeEventModifier> => {
	const valid_modifiers: SvelthreeEventModifier[] = []

	for (let i = 0; i < modifiers_arr.length; i++) {
		const modifier_name: string = modifiers_arr[i]
		if (!ALL_MODIFIERS_SET.has(modifier_name as SvelthreeEventModifier)) {
			console.error(`SVELTHREE > ${c_name} > ERROR: modifier '${modifier_name}'`)
		} else if (!valid_modifiers.includes(modifier_name as SvelthreeEventModifier)) {
			valid_modifiers.push(modifier_name as SvelthreeEventModifier)
		}
	}

	return new Set(valid_modifiers)
}

/** Adds entries to the `user_modifiers_prop` Map, by mapping the `modifiers` prop to: `event_name` / `all` => `modifier[]` (_**only valid modifiers!**_) */
export const set_modifiers_map_prop = (user_modifiers_prop: MapPropModifiers, modifiers: SvelthreeModifiersProp) => {
	for (const event_name_or_all in modifiers) {
		const modifiers_arr: SvelthreeEventModifier[] = modifiers[event_name_or_all as keyof SvelthreeModifiersProp]
		const valid_modifiers: Set<SvelthreeEventModifier> = get_valid_modifiers_only(modifiers_arr)

		user_modifiers_prop.set(event_name_or_all as SvelthreeSupportedInteractionEvent | "all", valid_modifiers)
	}
}

export const get_listener_options_from_modifiers_prop = (
	event_name: SvelthreeSupportedInteractionEvent,
	user_modifiers_prop: MapPropModifiers
): { [key in SupportedAddEventListenerOption]?: boolean } | undefined => {
	const all = user_modifiers_prop.has("all") ? user_modifiers_prop.get("all") : null
	const spec = user_modifiers_prop.has(event_name) ? user_modifiers_prop.get(event_name) : null

	let mods: Set<SvelthreeEventModifier> | undefined | null

	if (all && spec) {
		mods = new Set([...all, ...spec])
	} else {
		mods = all || spec
	}

	if (mods) {
		return get_opts(mods)
	} else {
		return undefined
	}
}

const get_opts = (
	source_set: Set<SvelthreeEventModifier>
): { [key in SupportedAddEventListenerOption]?: boolean } | undefined => {
	// default
	const opts: { [key in SupportedAddEventListenerOption]?: boolean } = {
		capture: false,
		passive: true, // IMPORTANT  `svelthree` default value
		once: false
	}

	source_set.forEach((key) => {
		if (ADD_EVENT_LISTENER_OPTIONS_SET.has(key as SupportedAddEventListenerOption) || key === "nonpassive") {
			if (key !== "passive" && key !== "nonpassive") {
				opts[key as SupportedAddEventListenerOption] = true
			} else if (key === "nonpassive") {
				opts.passive = false
			}
		}
	})

	// IMPORTANT  override `passive` if modifiers contain `preventDefault` and `passive` was set to `true`
	if (source_set.has("preventDefault")) {
		if (opts.passive === true) {
			opts.passive = false
			console.warn(
				`SVELTHREE > ${c_name} : The 'preventDefault' modifier cannot be used together with the 'passive' modifier, 'svelthree' has set (forced) the listener-option 'passive' to 'false'`
			)
		}
	}

	return opts
}
