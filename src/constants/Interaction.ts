type ElementType<T extends ReadonlyArray<unknown>> = T extends ReadonlyArray<infer ElementType> ? ElementType : never

export const SUPPORTED_ADD_EVENT_LISTENER_OPTIONS = [
	"once",
	"passive",
	"capture"
	//"signal" ->  RECONSIDER  implement?
] as const
export type SupportedAddEventListenerOption = ElementType<typeof SUPPORTED_ADD_EVENT_LISTENER_OPTIONS>
export const ADD_EVENT_LISTENER_OPTIONS_SET = new Set([...SUPPORTED_ADD_EVENT_LISTENER_OPTIONS])

export const SUPPORTED_MODIFIERS = [
	"preventDefault",
	"stopPropagation",
	"capture",
	"once",
	//"passive",    ->  TODO  implement
	//"nonpassive", ->  TODO  implement
	//"trusted",    ->  RECONSIDER  implement?
	"self"
] as const
export type SvelthreeSupportedModifier = ElementType<typeof SUPPORTED_MODIFIERS>

export const SUPPORTED_MODIFIERS_SET = new Set([...SUPPORTED_MODIFIERS])

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

export type SvelthreeSupportedPointerEvent = ElementType<typeof POINTER_EVENTS>

export const KEYBOARD_EVENTS = ["keydown", "keypress", "keyup"] as const
export type SvelthreeSupportedKeyboardEvent = ElementType<typeof KEYBOARD_EVENTS>
export const KEYBOARD_LISTENER_TARGETS = ["window", "document", "self"] as const
export type SvelthreeKeyboardListenerTarget = ElementType<typeof KEYBOARD_LISTENER_TARGETS>

export const FOCUS_EVENTS = ["focus", "blur", "focusin", "focusout"] as const
export type SvelthreeSupportedFocusEvent = ElementType<typeof FOCUS_EVENTS>

// TODO  implement wheel events
export const WHEEL_EVENTS = ["wheel", "wheelover"] as const
export type SvelthreeSupportedWheelEvent = ElementType<typeof WHEEL_EVENTS>
export const WHEEL_LISTENER_TARGETS = ["window", "document", "self"] as const
export type SvelthreeWheelListenerTarget = ElementType<typeof WHEEL_LISTENER_TARGETS>

export type SvelthreeSupportedInteractionEvent =
	| SvelthreeSupportedPointerEvent
	| SvelthreeSupportedFocusEvent
	| SvelthreeSupportedKeyboardEvent
	| SvelthreeSupportedWheelEvent // TODO  -> implement

//"touchstart", ->  RECONSIDER  implement?
//"touchmove",  ->  RECONSIDER  implement?
//"touchend",   ->  RECONSIDER  implement?
//"touchcancel" ->  RECONSIDER  implement?

export type SvelthreeModifiersProp =
	| { all?: SvelthreeSupportedModifier[] }
	| { [event_name in SvelthreeSupportedPointerEvent]?: Array<SvelthreeSupportedModifier> }
	| { [event_name in SvelthreeSupportedFocusEvent]?: Array<SvelthreeSupportedModifier> }
	| {
			[event_name in SvelthreeSupportedKeyboardEvent]?: Array<
				SvelthreeSupportedModifier | SvelthreeKeyboardListenerTarget
			>
	  }
	| {
			[event_name in SvelthreeSupportedWheelEvent]?: Array<
				SvelthreeSupportedModifier | SvelthreeWheelListenerTarget
			>
	  }

export type SvelthreeGenericEventHandler =
	| [handler: (e?: CustomEvent) => void, modifiers?: Array<SvelthreeSupportedModifier>]
	| ((e?: CustomEvent) => void)

export type SvelthreePointerEventHandler = SvelthreeGenericEventHandler
export type SvelthreeFocusEventHandler = SvelthreeGenericEventHandler
export type SvelthreeKeyboardEventHandler =
	| [
			handler: (e?: CustomEvent) => void,
			modifiers?: Array<SvelthreeSupportedModifier | SvelthreeKeyboardListenerTarget>
	  ]
	| ((e?: CustomEvent) => void)

export type SvelthreeWheelEventHandler =
	| [handler: (e?: CustomEvent) => void, modifiers?: Array<SvelthreeSupportedModifier | SvelthreeWheelListenerTarget>]
	| ((e?: CustomEvent) => void)
