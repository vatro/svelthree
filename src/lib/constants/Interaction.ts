export const SUPPORTED_ADD_EVENT_LISTENER_OPTIONS = [
	"once",
	"passive",
	"capture",
	"nonpassive"
	//"signal" ->  RECONSIDER  implement?
] as const

export const ADD_EVENT_LISTENER_OPTIONS_SET = new Set([...SUPPORTED_ADD_EVENT_LISTENER_OPTIONS])

export const STANDARD_MODIFIERS = [
	"preventDefault",
	"stopPropagation",
	"capture",
	"once",
	"passive", //->  TODO  implement
	"nonpassive", //->  TODO  implement
	//"trusted",    ->  RECONSIDER  implement?
	"self"
] as const

export const STANDARD_MODIFIERS_SET = new Set([...STANDARD_MODIFIERS])

export const ALL_MODIFIERS = [
	...STANDARD_MODIFIERS,
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
export const WHEEL_EVENTS = ["wheel", "wheelover"] as const

export const WHEEL_LISTENER_TARGETS = ["window", "document", "self"] as const
