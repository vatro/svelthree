import type {
	SvelthreeInteractableComponent,
	SvelthreeShadowDOMElement,
	MapPropModifiers,
	SvelthreeSupportedFocusEvent,
	SupportedAddEventListenerOption,
	SvelthreeSupportedInteractionEvent
} from "../../types/types-extra.js"
import { has_on_directive, using_event, not_using_event } from "./parent_comp_utils.js"
import { event_not_registered, event_is_registered, register_event, unregister_focus_event } from "./event_utils.js"
import { get_listener_options_from_modifiers_prop } from "./modifier_utils.js"
import { DEFAULT_DOM_LISTENER_OPTIONS, FOCUS_EVENTS } from "../../constants/Interaction.js"
type CanvasComponent = import("../../components/Canvas.svelte").default

/**
 * **Adds / removes** the **ShadowDOM**-Event-**Listener** _`on_focus(evt)`_ which manages
 * dispatching the **original** `FocusEvent` via `comp_interaction_dispatcher`.
 *
 * ⚠️ _The `Canvas`-component **doesn't emit any** `FocusEvent` related internal Events. `FocusEvent`s are not being registered on the `Canvas`-component!_
 */
export default class PointerEventManager {
	constructor(
		private shadow_dom_el: SvelthreeShadowDOMElement | undefined | null,
		private user_modifiers_prop: MapPropModifiers,
		private used_focus_events: Set<string>,
		private on_focus: (evt: FocusEvent) => void,
		private parent: SvelthreeInteractableComponent,
		private canvas_component: CanvasComponent | undefined,
		private shadow_dom_enabled: boolean | undefined,
		private c_name: string
	) {}

	public add_listener(event_name: SvelthreeSupportedFocusEvent): void {
		if (has_on_directive(event_name, this.parent)) {
			if (this.shadow_dom_enabled) {
				if (event_not_registered(event_name, this.used_focus_events)) {
					const listener_options =
						get_listener_options_from_modifiers_prop(event_name, this.user_modifiers_prop) ||
						DEFAULT_DOM_LISTENER_OPTIONS

					this.add_shadow_dom_listener(event_name, listener_options, this.on_focus)
					register_event(event_name, this.used_focus_events, this.canvas_component)
				} else {
					//console.warn(`'${event_name}' already registered!`)
				}
			} else {
				console.error(
					`SVELTHREE > ${this.c_name} > FocusEventManager > add_listener > Cannot add 'FocusEvent' ShadowDOM-Listener, ShadowDOM disabled / ShadowDOM-Element not available!`,
					{ shadow_dom_enabled: this.shadow_dom_enabled, shadow_dom_el: this.shadow_dom_el }
				)
			}
		}
	}

	private add_shadow_dom_listener(
		event_name: SvelthreeSupportedInteractionEvent,
		listener_options: { [key in SupportedAddEventListenerOption]?: boolean },
		listener: ((evt: FocusEvent) => void) | undefined
	): void {
		if (this.shadow_dom_el) {
			if (listener) {
				this.shadow_dom_el.addEventListener(event_name, listener as EventListener, listener_options)
			} else {
				console.error(
					`SVELTHREE > ${this.c_name} > FocusEventManager > add_shadow_dom_focus_listeners > Cannot add 'FocusEvent' ShadowDOM-Listener, Listener not available!`,
					{ listener }
				)
			}
		} else {
			console.error(
				`SVELTHREE > ${this.c_name} > FocusEventManager > add_shadow_dom_focus_listeners > Cannot add 'FocusEvent' ShadowDOM-Listener, ShadowDOM-Element not available!`,
				{ shadow_dom_enabled: this.shadow_dom_enabled, shadow_dom_el: this.shadow_dom_el }
			)
		}
	}

	public check_adding_listeners() {
		if (using_event("focus", this.parent)) this.add_listener("focus") // doesn't bubble
		if (using_event("blur", this.parent)) this.add_listener("blur") // doesn't bubble
		if (using_event("focusin", this.parent)) this.add_listener("focusin") // bubbles
		if (using_event("focusout", this.parent)) this.add_listener("focusout") // bubbles
	}

	public check_removing_listeners() {
		if (not_using_event("focus", this.parent)) this.remove_listener("focus")
		if (not_using_event("blur", this.parent)) this.remove_listener("blur")
		if (not_using_event("focusin", this.parent)) this.remove_listener("focusin")
		if (not_using_event("focusout", this.parent)) this.remove_listener("focusout")
	}

	public remove_all_listeners(): void {
		for (let i = 0; i < FOCUS_EVENTS.length; i++) {
			this.remove_listener(FOCUS_EVENTS[i])
		}
	}

	/** Remove unused but registered (were used) listeners. */
	private remove_listener(event_name: SvelthreeSupportedInteractionEvent): void {
		if (event_is_registered(event_name, this.used_focus_events)) {
			if (this.shadow_dom_enabled) {
				if (this.shadow_dom_el) {
					this.shadow_dom_el.removeEventListener(event_name, this.on_focus as EventListener, true)
					this.shadow_dom_el.removeEventListener(event_name, this.on_focus as EventListener, false)
				} else {
					console.error(
						`SVELTHREE > ${this.c_name} > FocusEventManager > remove_listener : Cannot remove '${event_name}' Listener from unavailable 'shadow_dom_el'!`,
						{ shadow_dom_enabled: this.shadow_dom_enabled, shadow_dom_el: this.shadow_dom_el }
					)
				}
			}
			unregister_focus_event(event_name, this.used_focus_events)
		}
	}
}
