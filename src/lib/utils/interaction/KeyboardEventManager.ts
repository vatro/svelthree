import type {
	SvelthreeInteractableComponent,
	SvelthreeShadowDOMElement,
	MapPropModifiers,
	SupportedAddEventListenerOption,
	SvelthreeSupportedInteractionEvent,
	SvelthreeSupportedKeyboardEvent,
	CanvasComponentEvent
} from "../../types/types-extra.js"
import { has_on_directive, using_event, not_using_event } from "./parent_comp_utils.js"
import { event_not_registered, event_is_registered, register_event, unregister_keyboard_event } from "./event_utils.js"
import { get_listener_options_from_modifiers_prop } from "./modifier_utils.js"
import { DEFAULT_DOM_LISTENER_OPTIONS, KEYBOARD_EVENTS } from "../../constants/Interaction.js"
type CanvasComponent = import("../../components/Canvas.svelte").default

/**
 * **Adds / removes** `KeyboardEvent` related Listeners which manage dispatching the corresponding component-`CustomEvent` via `comp_interaction_dispatcher`
 * by invoking the `on_keyboard(evt)` function.
 *
 * _The `<component_custom_event>.detail.evt` property will reference the **original** `KeyboardEvent` fired._
 */
export default class KeyboardEventManager {
	private canvas_keydown_off: (() => void) | undefined | null
	private canvas_keyup_off: (() => void) | undefined | null
	private canvas_keypress_off: (() => void) | undefined | null

	constructor(
		private shadow_dom_el: SvelthreeShadowDOMElement | undefined | null,
		private user_modifiers_prop: MapPropModifiers,
		private used_keyboard_events: Set<string>,
		private on_keyboard: (evt: KeyboardEvent, can_cancel_or_stop_propagation?: boolean) => void,
		private parent: SvelthreeInteractableComponent,
		private canvas_component: CanvasComponent | undefined,
		private shadow_dom_enabled: boolean | undefined,
		private c_name: string
	) {}

	public add_listener(event_name: SvelthreeSupportedKeyboardEvent): void {
		if (has_on_directive(event_name, this.parent)) {
			if (event_not_registered(event_name, this.used_keyboard_events)) {
				const listener_options =
					get_listener_options_from_modifiers_prop(event_name, this.user_modifiers_prop) ||
					DEFAULT_DOM_LISTENER_OPTIONS

				this.set_listener(event_name, listener_options)
			} else {
				//console.warn(`'${event_name}' already registered!`)
			}
		}
	}

	private set_listener(
		event_name: SvelthreeSupportedKeyboardEvent,
		listener_options: { [key in SupportedAddEventListenerOption]?: boolean }
	) {
		let modifiers_map: MapPropModifiers | undefined = undefined
		modifiers_map = this.user_modifiers_prop

		if (modifiers_map?.get(event_name)?.has("selfhost")) {
			// SPECIAL CASE:
			// - `Canvas.useShadowDom = true`
			// - `Canvas.defaultKeyboardEventListenerHost = 'document' or 'window'`
			// - `'selfhost'`-modifier was specified

			// ⚠️ The ShadowDOM-Element has to have focus in order to react to keyboard input.

			if (this.shadow_dom_el) {
				this.shadow_dom_el.addEventListener(event_name, this.on_keyboard as EventListener, listener_options)
				// ⚠️ we're adding the listener directly to ShadowDOM-Element, so we don't have to register it in the `canvas_component`
				register_event(event_name, this.used_keyboard_events)
			} else {
				const message_1 = `Cannot add 'KeyboardEvent' ShadowDOM-Listener (using the 'selfhost'-modifier), ShadowDOM-Element not available!`
				const message_2 = `The 'selfhost'-modifier can only be used if 'Canvas.useShadowDom' prop is 'true' (default).`
				console.error(
					`SVELTHREE > ${this.c_name} > KeyboardEventManager > set_listener : ${message_1} ${message_2}`,
					{ shadow_dom_enabled: this.shadow_dom_enabled, shadow_dom_el: this.shadow_dom_el }
				)
			}
		} else {
			// DEFAULT
			this.add_canvas_listener(event_name)
			register_event(event_name, this.used_keyboard_events, this.canvas_component)
		}
	}

	private canvas_keydown_on(): void {
		this.canvas_keydown_off = this.canvas_component?.$on("canvas_keydown", (evt: CanvasComponentEvent) =>
			this.on_keyboard(evt.detail.event as KeyboardEvent)
		)
	}

	private canvas_keyup_on(): void {
		this.canvas_keyup_off = this.canvas_component?.$on("canvas_keyup", (evt: CanvasComponentEvent) =>
			this.on_keyboard(evt.detail.event as KeyboardEvent)
		)
	}

	private canvas_keypress_on(): void {
		this.canvas_keypress_off = this.canvas_component?.$on("canvas_keypress", (evt: CanvasComponentEvent) =>
			this.on_keyboard(evt.detail.event as KeyboardEvent)
		)
	}

	private add_canvas_listener(event_name: SvelthreeSupportedInteractionEvent): void {
		switch (event_name) {
			case "keydown":
				if (!this.canvas_keydown_off) this.canvas_keydown_on()
				break
			case "keyup":
				if (!this.canvas_keyup_off) this.canvas_keyup_on()
				break
			case "keypress":
				if (!this.canvas_keypress_off) this.canvas_keypress_on()
				break
			default:
				console.error(
					`SVELTHREE > ${this.c_name} > KeyboardEventManager > add_canvas_listener : KeyboardEvent '${event_name}' not implemented!`
				)
				break
		}
	}

	public check_adding_listeners() {
		if (using_event("keydown", this.parent)) this.add_listener("keydown")
		if (using_event("keypress", this.parent)) this.add_listener("keypress")
		if (using_event("keyup", this.parent)) this.add_listener("keyup")
	}

	public check_removing_listeners() {
		if (not_using_event("keydown", this.parent)) this.remove_listener("keydown")
		if (not_using_event("keypress", this.parent)) this.remove_listener("keypress")
		if (not_using_event("keyup", this.parent)) this.remove_listener("keyup")
	}

	public remove_all_listeners(): void {
		for (let i = 0; i < KEYBOARD_EVENTS.length; i++) {
			this.remove_listener(KEYBOARD_EVENTS[i])
		}
	}

	/** Remove unused but registered (were used) listeners. */
	private remove_listener(event_name: SvelthreeSupportedInteractionEvent): void {
		if (event_is_registered(event_name, this.used_keyboard_events)) {
			switch (event_name) {
				case "keydown":
					if (this.canvas_keydown_off) {
						this.canvas_keydown_off()
						this.canvas_keydown_off = null
					}
					break
				case "keyup":
					if (this.canvas_keyup_off) {
						this.canvas_keyup_off()
						this.canvas_keyup_off = null
					}
					break
				case "keypress":
					if (this.canvas_keypress_off) {
						this.canvas_keypress_off()
						this.canvas_keypress_off = null
					}
					break
				default:
					console.error(
						`SVELTHREE > ${this.c_name} > KeyboardEventManager > remove_listener : KeyboardEvent '${event_name}' not implemented!`
					)
					break
			}

			if (this.shadow_dom_enabled) {
				if (this.shadow_dom_el) {
					this.shadow_dom_el.removeEventListener(event_name, this.on_keyboard as EventListener, false)
					this.shadow_dom_el.removeEventListener(event_name, this.on_keyboard as EventListener, true)
				} else {
					console.error(
						`SVELTHREE > ${this.c_name} > KeyboardEventManager > remove_listener : Cannot remove Listener from unavailable 'shadow_dom_el'!`,
						{ shadow_dom_enabled: this.shadow_dom_enabled, shadow_dom_el: this.shadow_dom_el }
					)
				}
			}

			unregister_keyboard_event(event_name, this.used_keyboard_events, this.canvas_component)
		}
	}
}
