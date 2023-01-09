import { ALL_MODIFIERS_SET } from "../../constants/Interaction.js"
import type {
	MapActionUserModifiers,
	MapPropUserModifiers,
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
export const set_modifiers_map_prop = (
	user_modifiers_prop: MapPropUserModifiers,
	modifiers: SvelthreeModifiersProp
) => {
	for (const event_name_or_all in modifiers) {
		const modifiers_arr: SvelthreeEventModifier[] = modifiers[event_name_or_all as keyof SvelthreeModifiersProp]
		const valid_modifiers: Set<SvelthreeEventModifier> = get_valid_modifiers_only(modifiers_arr)

		user_modifiers_prop.set(event_name_or_all as SvelthreeSupportedInteractionEvent | "all", valid_modifiers)
	}
}

/**
 * Adds entries to the `user_modifiers_action` Map while also taking the specified `modifiers.all` modifiers into account,
 * maps the `modifiers` specified in an "action" prop to: `event_name` => `modifier[]` (_**only valid modifiers** incl. `modifiers.all`!_)
 */
export const set_modifiers_map_action = (
	event_name: SvelthreeSupportedInteractionEvent,
	modifiers_arr: SvelthreeEventModifier[] | null,
	user_modifiers_prop: MapPropUserModifiers,
	user_modifiers_action: MapActionUserModifiers
): void => {
	const all = user_modifiers_prop.has("all") ? user_modifiers_prop.get("all") : null
	const spec = user_modifiers_prop.has(event_name) ? user_modifiers_prop.get(event_name) : null
	const user = modifiers_arr ? get_valid_modifiers_only(modifiers_arr) : null

	let mods: Set<SvelthreeEventModifier> | undefined = undefined

	if (all && spec) {
		if (user) {
			mods = new Set([...all, ...spec, ...user])
		} else {
			mods = new Set([...all, ...spec])
		}
	} else {
		if (all) {
			if (user) {
				mods = new Set([...all, ...user])
			} else {
				mods = new Set([...all])
			}
		} else if (spec) {
			if (user) {
				mods = new Set([...spec, ...user])
			} else {
				mods = new Set([...spec])
			}
		} else if (!all && !spec) {
			if (user) mods = new Set([...user])
		}
	}

	if (mods) {
		user_modifiers_action.set(event_name, mods)
	} else {
		// TODO  do nothing / silent?
	}
}
