import type {
	MapPropModifiers,
	SupportedAddEventListenerOption,
	SvelthreeInteractableComponent,
	SvelthreeShadowDOMElement,
	SvelthreeSupportedInteractionEvent,
	SvelthreeSupportedWheelEvent
} from "../../types/types-extra.js"
type CanvasComponent = import("../../components/Canvas.svelte").default
import { has_on_directive, using_event, not_using_event } from "./parent_comp_utils.js"
import {
	event_not_registered,
	event_is_registered,
	register_event,
	cancel_or_stop_propagation,
	unregister_wheel_event,
	invoke_default_callback
} from "./event_utils.js"
import { get_listener_options_from_modifiers_prop } from "./modifier_utils.js"
import { DEFAULT_DOM_LISTENER_OPTIONS, WHEEL_EVENTS } from "../../constants/Interaction.js"

/** **Manages / checks** the state of the **pointer**. Contains methods for conditional **dispatching** of corresponding **cloned** `PointerEvent`s via the **ShadowDOM-Element** first or via immediate invoking of the `on_pointer`. */
export default class WheelEventManager {
	private canvas_wheel_off: (() => void) | undefined | null

	constructor(
		private shadow_dom_el: SvelthreeShadowDOMElement | undefined | null,
		private intersects: () => boolean,
		private user_modifiers_prop: MapPropModifiers,
		private used_wheel_events: Set<string>,
		private on_wheel: (evt: WheelEvent, on_intersect: boolean) => void,
		private parent: SvelthreeInteractableComponent,
		private canvas_component: CanvasComponent | undefined,
		private shadow_dom_enabled: boolean | undefined,
		private c_name: string
	) {}

	// --- LISTENERS ---
	private shadow_dom_listener: EventListener | undefined

	public check_adding_listeners() {
		if (using_event("wheel", this.parent)) this.add_listener("wheel")
	}

	public check_removing_listeners() {
		if (not_using_event("wheel", this.parent)) this.remove_listener("wheel")
	}

	private add_listener(event_name: SvelthreeSupportedWheelEvent): void {
		if (has_on_directive(event_name, this.parent)) {
			if (event_not_registered(event_name, this.used_wheel_events)) {
				const listener_options =
					get_listener_options_from_modifiers_prop(event_name, this.user_modifiers_prop) ||
					DEFAULT_DOM_LISTENER_OPTIONS

				this.set_listener(event_name, listener_options, true)
			} else {
				//console.warn(`'${event_name}' already registered!`)if()
			}
		}
	}

	private set_listener(
		event_name: SvelthreeSupportedWheelEvent,
		listener_options: { [key in SupportedAddEventListenerOption]?: boolean },
		dispatch_via_shadow_dom: boolean
	) {
		let modifiers_map: MapPropModifiers | undefined = undefined
		modifiers_map = this.user_modifiers_prop

		// "intersect" modifier -> dispatch wheel Event only if pointer intersects the object
		const on_intersect = !!modifiers_map?.get(event_name)?.has("intersect")

		const has_global = !!modifiers_map?.get(event_name)?.has("global")
		const has_global_window = !!modifiers_map?.get(event_name)?.has("global:window")
		const has_global_document = !!modifiers_map?.get(event_name)?.has("global:document")

		const is_global = has_global || has_global_window || has_global_document

		//let shadow_dom_listener: ((evt: WheelEvent) => void) | undefined = undefined
		//shadow_dom_listener = on_intersect ? this.on_wheel_intersection_dep : this.on_wheel_intersection_indep

		if (is_global) {
			const global_host = has_global_document ? document : window

			// will dispatch ShadowDOM-Element Event via `hybrid_dispatch` if `shadow_dom_enabled: true`
			// ->  will invoke `on_wheel_intersection_dep` / `on_wheel_intersection_indep`
			const global_listener = (evt: WheelEvent) => {
				this.hybrid_dispatch(evt, on_intersect, is_global)
			}

			if (this.shadow_dom_enabled && dispatch_via_shadow_dom) {
				if (this.shadow_dom_el) {
					this.shadow_dom_el.addEventListener(
						event_name,
						(this.shadow_dom_listener = ((evt: WheelEvent) =>
							this.on_wheel(evt, on_intersect)) as EventListener),
						listener_options
					)
				} else {
					console.error(
						`SVELTHREE > ${this.c_name} > set_listener > Cannot add 'WheelEvent' ShadowDOM-Listener, ShadowDOM-Element not available!`,
						{ shadow_dom_enabled: this.shadow_dom_enabled, shadow_dom_el: this.shadow_dom_el }
					)
				}
			}

			global_host.addEventListener(event_name, global_listener as EventListener, listener_options)

			// ⚠️ for 'is_global' we have to try to invoke `onWheelEvent` manually! See `hybrid_dispatch(...)`!
			register_event(event_name, this.used_wheel_events)
		} else {
			// TODO  Does it even make sense to re-dispatch wheel Event via ShadowDOM-Element?! What's the use case?!
			if (this.shadow_dom_enabled && dispatch_via_shadow_dom) {
				if (this.shadow_dom_el) {
					this.shadow_dom_el.addEventListener(
						event_name,
						(this.shadow_dom_listener = ((evt: WheelEvent) =>
							this.on_wheel(evt, on_intersect)) as EventListener),
						listener_options
					)
				} else {
					console.error(
						`SVELTHREE > ${this.c_name} > set_listener > Cannot add 'WheelEvent' ShadowDOM-Listener, ShadowDOM-Element not available!`,
						{ shadow_dom_enabled: this.shadow_dom_enabled, shadow_dom_el: this.shadow_dom_el }
					)
				}
			}

			this.add_canvas_listener(event_name, on_intersect)
			register_event(event_name, this.used_wheel_events, this.canvas_component)
		}
	}

	/* private add_shadow_dom_listener(
		event_name: SvelthreeSupportedInteractionEvent,
		listener_options: { [key in SupportedAddEventListenerOption]?: boolean },
		listener: ((evt: WheelEvent) => void) | undefined
	): void {
		if (this.shadow_dom_el) {
			if (listener) {
				this.shadow_dom_el.addEventListener(event_name, listener as EventListener, listener_options)
			} else {
				console.error(
					`SVELTHREE > ${this.c_name} > add_shadow_dom_listener > Cannot add 'WheelEvent' ShadowDOM-Listener, Listener not available!`,
					{ listener }
				)
			}
		} else {
			console.error(
				`SVELTHREE > ${this.c_name} > add_shadow_dom_listener > Cannot add 'WheelEvent' ShadowDOM-Listener, ShadowDOM-Element not available!`,
				{ shadow_dom_enabled: this.shadow_dom_enabled, shadow_dom_el: this.shadow_dom_el }
			)
		}
	} */

	private add_canvas_listener(event_name: SvelthreeSupportedInteractionEvent, on_intersect: boolean): void {
		switch (event_name) {
			case "wheel":
				if (!this.canvas_wheel_off) this.canvas_wheel_on(on_intersect)
				break
			default:
				console.error(`SVELTHREE > ${this.c_name} > WheelEvent '${event_name}' not implemented!`)
				break
		}
	}

	private canvas_wheel_on(on_intersect: boolean): void {
		this.canvas_wheel_off = this.canvas_component?.$on("canvas_wheel", (evt: { detail: { event: WheelEvent } }) =>
			this.hybrid_dispatch(evt.detail.event, on_intersect)
		)
	}

	/**
	 * - `shadow_dom_enabled: true`:
	 *
	 *  if not global:
	 *  - dispatch via ShadowDOM-Element first
	 *    - invokes `on_wheel(evt, true / false)`
	 *
	 * _`<comp_custom_event>.detail.evt` Event will be **synthetic**._
	 *
	 * ---
	 * - `shadow_dom_enabled: false`:
	 *    - invokes `on_wheel(evt, true / false)`
	 *
	 * _`<comp_custom_event>.detail.evt` Event will be the **original** Event fired._
	 *
	 */
	private hybrid_dispatch(evt: WheelEvent, on_intersect: boolean, is_global?: boolean) {
		if (is_global) {
			// if 'global', `global:window` or `global:document` modifiers were specified via `modifiers` prop:
			// invoke default `WheelEvent` callback if the Event isn't registered in `Canvas`-component
			invoke_default_callback(
				evt,
				"onWheelEvent",
				this.canvas_component,
				`${this.c_name} > WheelEventManager > hybrid_dispatch`
			)
		}

		let intersects: boolean | undefined = undefined
		if (on_intersect) intersects = this.intersects()

		// cancel / stop original WheelEvent
		if (on_intersect) {
			if (intersects) {
				cancel_or_stop_propagation(evt, this.user_modifiers_prop)
			}
		} else {
			cancel_or_stop_propagation(evt, this.user_modifiers_prop)
		}

		// TODO  Does it even make sense to re-dispatch wheel Event via ShadowDOM-Element?! What's the use case?!
		if (this.shadow_dom_enabled) {
			if (this.shadow_dom_el) {
				const cloned_evt: WheelEvent = this.clone_evt(evt)

				// cancel / stop synthetic WheelEvent
				cancel_or_stop_propagation(cloned_evt, this.user_modifiers_prop)

				if (on_intersect) {
					if (intersects) {
						this.shadow_dom_el.dispatchEvent(cloned_evt)
					}
				} else {
					this.shadow_dom_el.dispatchEvent(cloned_evt)
				}
			} else {
				console.error(
					`SVELTHREE > ${this.c_name} > hybrid_dispatch : Cannot dispatch WheelEvent '${evt.type}' via unavailable 'shadow_dom_el'!`,
					{ shadow_dom_enabled: this.shadow_dom_enabled, shadow_dom_el: this.shadow_dom_el }
				)
			}
		} else {
			if (on_intersect) {
				if (intersects) {
					this.on_wheel(evt, true)
				}
			} else {
				/* this.on_wheel_intersection_indep(evt) */
				this.on_wheel(evt, false)
			}
		}
	}

	/* private on_wheel_intersection_dep(evt: WheelEvent) {
		this.on_wheel(evt, true)
	}

	private on_wheel_intersection_indep(evt: WheelEvent) {
		this.on_wheel(evt, false)
	} */

	public remove_all_listeners(): void {
		for (let i = 0; i < WHEEL_EVENTS.length; i++) {
			this.remove_listener(WHEEL_EVENTS[i])
		}
	}

	/** Removes unused but registered (was used) Listener. */
	private remove_listener(event_name: SvelthreeSupportedInteractionEvent): void {
		if (event_is_registered(event_name, this.used_wheel_events)) {
			switch (event_name) {
				case "wheel":
					if (this.canvas_wheel_off) {
						this.canvas_wheel_off()
						this.canvas_wheel_off = null
					}
					break
				default:
					console.error(
						`SVELTHREE > ${this.c_name} > completely_remove_wheel_listener : WheelEvent '${event_name}' not implemented!`
					)
					break
			}

			if (this.shadow_dom_enabled) {
				if (this.shadow_dom_el) {
					this.shadow_dom_el.removeEventListener(event_name, this.shadow_dom_listener as EventListener, true)
					this.shadow_dom_el.removeEventListener(event_name, this.shadow_dom_listener as EventListener, false)
					/* this.shadow_dom_el.removeEventListener(
						event_name,
						this.on_wheel_intersection_indep as EventListener,
						false
					)
					this.shadow_dom_el.removeEventListener(
						event_name,
						this.on_wheel_intersection_indep as EventListener,
						true
					)
					this.shadow_dom_el.removeEventListener(
						event_name,
						this.on_wheel_intersection_dep as EventListener,
						false
					)
					this.shadow_dom_el.removeEventListener(
						event_name,
						this.on_wheel_intersection_dep as EventListener,
						true
					) */
				} else {
					console.error(
						`SVELTHREE > ${this.c_name} > completely_remove_wheel_listener : Cannot remove Listener from unavailable 'shadow_dom_el'!`,
						{ shadow_dom_enabled: this.shadow_dom_enabled, shadow_dom_el: this.shadow_dom_el }
					)
				}
			}

			unregister_wheel_event(event_name, this.used_wheel_events, this.canvas_component)
		}
	}

	/**
	 * **Clone** original `WheelEvent`s and **re-type** them if needed, in order to dispatch them via ShadowDOM-Element.
	 * - `click` -> **same type**.
	 * - `pointerover`, `pointerout` and `pointermoveover` -> **re-typed** `pointermove`.
	 *
	 * We need to do this, because we cannot re-dispatch the original `PointerEvent` that already occured on the `<canvas>` DOM Element
	 * through some other DOM / ShadowDOM-Element.
	 */
	clone_evt(evt: WheelEvent, new_type: string | null = null): WheelEvent {
		const event_init: { [key: string]: unknown } = { composed: undefined }

		// simply spreading the Event object -> `{...e}` doesn't work:
		// "The spread operator only copies an object's own enumerable properties, not properties found higher on the prototype chain."
		// + we cannot simply alter the value of `composed` via e.g. `evt.composed = false`
		for (const key in evt) {
			if (key !== "path") {
				event_init[key] = evt[key as keyof WheelEvent]
			}
		}

		//  IMPORTANT  Setting `composed` to false:
		// prevents propagation of the Event (dispatched via a ShadowDOM-Element) to outer light dom.
		// see: https://developer.mozilla.org/en-US/docs/Web/API/Event/composed
		event_init.composed = false

		const cloned_and_modified_event: WheelEvent = new_type
			? new WheelEvent(new_type, event_init)
			: new WheelEvent(evt.type, event_init)
		return cloned_and_modified_event
	}
}
