import type { SupportedAddEventListenerOption } from "../types/types-extra.js"

export const SUPPORTED_ADD_EVENT_LISTENER_OPTIONS = [
	"once",
	"passive",
	"capture"
	//"signal" ->  RECONSIDER  implement?
] as const

export const ADD_EVENT_LISTENER_OPTIONS_SET = new Set([...SUPPORTED_ADD_EVENT_LISTENER_OPTIONS])

export const STANDARD_MODIFIERS = [
	"preventDefault",
	"stopPropagation",
	"capture",
	"once",
	"passive",
	"nonpassive"
	//"trusted",    ->  RECONSIDER  implement?
] as const

export const STANDARD_MODIFIERS_SET = new Set([...STANDARD_MODIFIERS])

export const ALL_MODIFIERS = [
	...STANDARD_MODIFIERS,
	"selfhost", // -> `KeyboardEvent` only -> add a `KeyboardEvent` Listener to the ShadowDOM-Element directly (not using internal Event via `Canvas`-component)
	"intersect", // -> extra: atm  wheel event only
	"global:document", // extra: atm wheel event only -> add listener directly to `document` -> should still redispatch event via shadow DOM, basically using `document` as canvas!
	"global:window", // -> extra: atm wheel event only ->  add listener directly to `window` -> should still redispatch event via shadow DOM, basically using `window` as canvas!
	"global" // -> extra: atm wheel only
] as const

export const ALL_MODIFIERS_SET = new Set([...ALL_MODIFIERS])

export const POINTER_EVENTS = [
	"click",
	"pointerup",
	"pointerdown",
	"pointerover",
	"pointerout",
	//"pointerenter", DEPRECATED  -> same as "pointerover"
	//"pointerleave", DEPRECATED  -> same as "pointerout"
	"pointermove",
	"pointermoveover"
	//"gotpointercapture",  ->  RECONSIDER  implement?
	//"lostpointercapture", ->  RECONSIDER  implement?
	//"pointercancel"       ->  RECONSIDER  implement?
] as const

export const KEYBOARD_EVENTS = ["keydown", "keypress", "keyup"] as const

export const KEYBOARD_LISTENER_TARGETS = ["window", "document", "self"] as const

export const FOCUS_EVENTS = ["focus", "blur", "focusin", "focusout"] as const

// TODO  implement wheel events
export const WHEEL_EVENTS = ["wheel"] as const

export const WHEEL_LISTENER_TARGETS = ["window", "document", "self"] as const

export const DEFAULT_DOM_LISTENER_OPTIONS: { [key in SupportedAddEventListenerOption]: boolean } = {
	capture: false,
	passive: true, // IMPORTANT  `svelthree` default value
	once: false
}
