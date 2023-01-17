import type { MapPropModifiers, SvelthreeSupportedInteractionEvent } from "../../types/types-extra.js"
type CanvasComponent = import("../../components/Canvas.svelte").default

const c_name = "SvelthreeInteraction"

const event_not_registered = (event_name: SvelthreeSupportedInteractionEvent, target_set: Set<string>) => {
	return !target_set.has(event_name)
}

const event_is_registered = (event_name: SvelthreeSupportedInteractionEvent, target_set: Set<string>) => {
	return target_set.has(event_name)
}

const register_event = (
	event_name: SvelthreeSupportedInteractionEvent,
	target_set: Set<string>,
	canvas_component: CanvasComponent | undefined
) => {
	if (canvas_component) {
		if (!target_set.has(event_name)) {
			target_set.add(event_name)

			// register specific events on the <canvas> element (some pointer, all keyboard events and wheel event)
			switch (event_name) {
				case "click":
				case "pointerdown":
				case "pointerup":
				case "keydown":
				case "keyup":
				case "keypress":
				case "wheel":
					canvas_component.register_canvas_listener(event_name)
					break
				default:
					break
			}
		}
	} else {
		console.error(
			`SVELTHREE > > ${c_name} > register_event : Cannot register '${event_name}' Event on 'Canvas' component, 'canvas_component' not available!`,
			{ canvas_component }
		)
	}
}

const unregister_pointer_event = (
	event_name: SvelthreeSupportedInteractionEvent,
	used_pointer_events: Set<string>,
	canvas_component: CanvasComponent | undefined
) => {
	delete_event_from_set(event_name, used_pointer_events)

	if (canvas_component) {
		switch (event_name) {
			case "click":
			case "pointerdown":
			case "pointerup":
				canvas_component.unregister_canvas_listener(event_name)
				break
			default:
				break
		}
	} else {
		console.error(
			`SVELTHREE > ${c_name} > unregister_pointer_event : Cannot unregister '${event_name}' Event on 'Canvas' component, 'canvas_component' not available!`,
			{ canvas_component }
		)
	}
}

const unregister_keyboard_event = (
	event_name: SvelthreeSupportedInteractionEvent,
	used_keyboard_events: Set<string>,
	canvas_component: CanvasComponent | undefined
) => {
	delete_event_from_set(event_name, used_keyboard_events)

	if (canvas_component) {
		canvas_component.unregister_canvas_listener(event_name)
	} else {
		console.error(
			`SVELTHREE > ${c_name} > unregister_keyboard_event : Cannot unregister '${event_name}' Event on 'Canvas' component, 'canvas_component' not available!`,
			{ canvas_component }
		)
	}
}

const unregister_wheel_event = (
	event_name: SvelthreeSupportedInteractionEvent,
	used_wheel_events: Set<string>,
	canvas_component: CanvasComponent | undefined
) => {
	delete_event_from_set(event_name, used_wheel_events)

	if (canvas_component) {
		canvas_component.unregister_canvas_listener(event_name)
	} else {
		console.error(
			`SVELTHREE > ${c_name} > unregister_wheel_event : Cannot unregister '${event_name}' Event on 'Canvas' component, 'canvas_component' not available!`,
			{ canvas_component }
		)
	}
}

const unregister_focus_event = (event_name: SvelthreeSupportedInteractionEvent, used_focus_events: Set<string>) => {
	delete_event_from_set(event_name, used_focus_events)
}

const delete_event_from_set = (event_name: SvelthreeSupportedInteractionEvent, target_set: Set<string>) => {
	if (target_set.has(event_name)) target_set.delete(event_name)
}

/*  CANCEL OR STOP PROPAGATION  */

// TODO  check the comments below concerning 'default Svelte first' approach, still valid?

/**
 * -  IMPORTANT  mode `"always"`:
 *   calling `evt.preventDefault()` / `evt.stopPropagation()` inside a callback **will have NO effect** ☝️,
 * because the event was already emitted at some point during the animation, so `evt.preventDefault()` / `evt.stopPropagation()` **HAVE TO**
 * be set via `modifiers` prop in order to cancel event's default (DOM) action or stop propagation at the exact same moment it occured.
 *
 * -  IMPORTANT  mode `"auto"`:
 *   calling `evt.preventDefault()` inside a callback **will have effect** ☝️, means
 * `evt.preventDefault()` / `evt.stopPropagation()` **CAN** but **do NOT HAVE TO** be set via `modifiers` prop
 * in order to cancel event's default (DOM) action or stop propagation at the exact same moment it occured.
 */
const cancel_or_stop_propagation = (
	evt: PointerEvent | FocusEvent | KeyboardEvent | WheelEvent,
	user_modifiers_prop: MapPropModifiers
): void => {
	if (
		user_modifiers_prop.get("all")?.has("preventDefault") ||
		user_modifiers_prop.get(evt.type as SvelthreeSupportedInteractionEvent)?.has("preventDefault")
	) {
		prevent_default(evt)
	}
	if (
		user_modifiers_prop.get("all")?.has("stopPropagation") ||
		user_modifiers_prop.get(evt.type as SvelthreeSupportedInteractionEvent)?.has("stopPropagation")
	) {
		stop_propagation(evt)
	}
}

const prevent_default = (evt: PointerEvent | FocusEvent | KeyboardEvent | WheelEvent) => {
	evt.preventDefault()
}

const stop_propagation = (evt: PointerEvent | FocusEvent | KeyboardEvent | WheelEvent) => {
	evt.stopPropagation()
}

export {
	event_not_registered,
	event_is_registered,
	register_event,
	cancel_or_stop_propagation,
	unregister_pointer_event,
	unregister_keyboard_event,
	unregister_focus_event,
	unregister_wheel_event
}
