<!--
`accessors:true` hast to be set per component because of the svelte-language-server bug, otherwise accessors would be falsely detected as missing and highlighted as errors.
svelthree uses svelte-accmod, where accessors are always `true`, regardless of `svelte:options`.  
-->
<svelte:options accessors />

<!-- 
@component
This is a **svelthree** _SvelthreeInteraction_ Component.  
[ tbd ]  Link to Docs.
-->
<script lang="ts">
	import { onMount, beforeUpdate, afterUpdate, getContext } from "svelte"
	import { get_current_component, SvelteComponentDev } from "svelte/internal"
	import { Object3D, Raycaster, Vector3 } from "three"
	import { svelthreeStores } from "svelthree/stores"
	import { c_dev, c_lc_int, verbose_mode, get_comp_name_int } from "../utils/SvelthreeLogger"
	import type { LogLC, LogDEV } from "../utils/SvelthreeLogger"
	import type { PointerState } from "../types-extra"
	import type { Writable } from "svelte/store"
	/**
	 * SVELTEKIT  SSR
	 * `browser` is needed for the SvelteKit setup (SSR / CSR / SPA).
	 * For non-SSR output in RollUp only and Vite only setups (CSR / SPA) we're just mimicing `$app/env` where `browser = true`,
	 * -> TS fix: `$app/env` mapped to `src/$app/env` via svelthree's `tsconfig.json`'s `path` property.
	 * -> RollUp only setup: replace `$app/env` with `../$app/env`
	 * The import below will work out-of-the-box in a SvelteKit setup.
	 */
	import { browser } from "$app/env"

	const c_name = get_comp_name_int(get_current_component())
	const verbose: boolean = verbose_mode()

	export let log_dev: { [P in keyof LogDEV]: LogDEV[P] } = undefined
	//export let log_rs: boolean = false
	export let log_lc: { [P in keyof LogLC]: LogLC[P] } = undefined

	export let interactionEnabled: boolean
	export let parent: SvelteComponentDev
	export let sti: number = getContext("store_index")
	export let obj: Object3D

	let raycaster: Raycaster
	$: raycaster = $svelthreeStores[sti].raycaster

	export let dispatch: (type: string, detail?: any) => void

	const pointer: PointerState = getContext("pointer")
	const all_intersections: { result: any[] } = getContext("all_intersections")
	const canvas_dom: Writable<{ element: HTMLCanvasElement }> = getContext("canvas_dom")
	const pointer_over_canvas: Writable<{ status: boolean }> = getContext("pointer_over_canvas")

	const pointer_events_queue = []
	const keyboard_events_queue = []

	let c: HTMLElement
	$: c = $canvas_dom.element

	let listeners: boolean = false

	$: if (c && raycaster && interactionEnabled && obj && !obj.userData.interact) {
		obj.userData.interact = true
		listeners = true
	}

	let out_of_canvas_triggered: boolean = false

	$: if (obj.userData.interact && $pointer_over_canvas.status === false) {
		if (!out_of_canvas_triggered) {
			out_of_canvas_triggered = true
			// detect if pointer is out of canvas and fire pointer out/leave events if needed.
			if (!obj.userData.block) {
				check_pointer_overout(pointer.event)
			}
		}
	}

	$: if (obj.userData.interact && $pointer_over_canvas.status === true) {
		if (out_of_canvas_triggered) {
			out_of_canvas_triggered = false
		}
	}

	let remove_interaction_2_listener: () => void

	// animated scenes -> check intersections / fire events on every rendered frame, even if pointer is not moving
	function add_interaction_2_listener(): void {
		remove_interaction_2_listener = $svelthreeStores[sti].rendererComponent.$on("interaction_2", () => {
			pointer.event ? check_pointer(pointer.event) : null
			check_keyboard()
		})
	}

	// e will always be `pointermove` event!
	function check_pointer(e: PointerEvent): void {
		check_pointer_overout(e)
		dispatch_pointer_event(e)

		// with mode "auto":
		// - there should be nothing inside 'pointer_events_queue'
		//   because all pointer events are being dispatched immediatelly! (not bound to render interactivity events / not raf aligned)
		// - we need the 'check_pointer' function only for the over/out related events if the pointer is not moving!
		if (pointer_events_queue.length) {
			for (let i = 0; i < pointer_events_queue.length; i++) {
				pointer_events_queue[i]()
			}
		}

		pointer_events_queue.length = 0
	}

	function check_keyboard(): void {
		if (keyboard_events_queue.length) {
			for (let i = 0; i < keyboard_events_queue.length; i++) {
				keyboard_events_queue[i]()
			}
		}

		keyboard_events_queue.length = 0
	}

	/** If the callbacks array of a certain directive (e.g. `on:click`) is emtpy or all callbacks are nullish, the corresponding event listener (e.g. "click") will be removed. */
	function has_on_directive(on_directive: string): boolean {
		const has_directive_key: boolean = Object.keys(parent.$$.callbacks).includes(on_directive)
		const directive_callbacks: any[] | null = has_directive_key ? parent.$$.callbacks[on_directive] : null

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

	function has_prop_action(prop_action: string): boolean {
		return !!parent[prop_action]
	}

	function using_event(event_name: string): boolean {
		return has_on_directive(event_name) || parent[`on_${event_name}`]
	}

	function not_using_event(event_name: string): boolean {
		return !has_on_directive(event_name) && !parent[`on_${event_name}`]
	}

	let listeners_counter = 0

	function add_pointer_listener(event_name: string, capture: boolean = false): void {
		//console.log(`SVELTHREE > ${c_name} > add pointer '${event_name}' listener!`)
		c.addEventListener(event_name, dispatch_pointer_event, capture)
	}

	function remove_pointer_listener(event_name: string): void {
		//console.log(`SVELTHREE > ${c_name} > remove pointer '${event_name}' listener!`)
		c.removeEventListener(event_name, dispatch_pointer_event)
		listeners_counter--
	}

	function add_keyboard_listener(event_name: string, capture: boolean = false): void {
		//console.log(`SVELTHREE > ${c_name} > add keyboard '${event_name}' listener!`)
		window.addEventListener(event_name, dispatch_keyboard_event, capture)
	}

	function remove_keyboard_listener(event_name: string): void {
		//console.log(`SVELTHREE > ${c_name} > remove keyboard '${event_name}' listener!`)
		window.removeEventListener(event_name, dispatch_keyboard_event)
		listeners_counter--
	}

	const keyboard_events = ["keydown", "keypress", "keyup"]

	const pointer_events = [
		"click",
		"pointerup",
		"pointerdown",
		"gotpointercapture",
		"lostpointercapture",
		"pointercancel"
	]

	/** for `SvelthreeInteraction` component's reactive listener management only */
	export let callbacks = undefined

	// reactive listener management checks
	$: r_add = interactionEnabled && listeners
	$: r_remove = !interactionEnabled && listeners

	// Reactively add / remove pointer listeners, works with e.g. (syntax):

	// programmatically:
	//   - add/re-add: `comp.on("click", onClick)`
	//   - disable/remove: `comp.onx("click", onClick)`

	// dom directive:
	//   - add: `<Mesh on:click={onClick} />
	//   - disable/remove: `comp.onx("click", turn_wheel)` or not adding to dom in the first place

	// interaction prop (internal action):
	//   - add/re-add: `<Mesh on_click={onClick} /> or `comp.on_click = {onClick}`
	//   - disable/remove: `comp.on_click = null` or not adding to dom in the first place

	// COOL!  Multiple `on:` directives WILL be triggered as expected.

	$: if (r_add || (callbacks && interactionEnabled)) {
		listeners_counter = 0

		if (using_event("click")) add_pointer_listener("click")
		if (using_event("pointerup")) add_pointer_listener("pointerup")
		if (using_event("pointerdown")) add_pointer_listener("pointerdown")
		if (using_event("gotpointercapture")) add_pointer_listener("gotpointercapture")
		if (using_event("lostpointercapture")) add_pointer_listener("lostpointercapture")
		if (using_event("pointercancel")) add_pointer_listener("pointercancel")
		if (using_event("keydown")) add_keyboard_listener("keydown")
		if (using_event("keypress")) add_keyboard_listener("keypress")
		if (using_event("keyup")) add_keyboard_listener("keyup")

		if (not_using_event("click")) remove_pointer_listener("click")
		if (not_using_event("pointerup")) remove_pointer_listener("pointerup")
		if (not_using_event("pointerdown")) remove_pointer_listener("pointerdown")
		if (not_using_event("pointerover")) listeners_counter--
		if (not_using_event("pointerout")) listeners_counter--
		if (not_using_event("pointerenter")) listeners_counter--
		if (not_using_event("pointerleave")) listeners_counter--
		if (not_using_event("pointermove")) listeners_counter--
		if (not_using_event("gotpointercapture")) remove_pointer_listener("gotpointercapture")
		if (not_using_event("lostpointercapture")) remove_pointer_listener("lostpointercapture")
		if (not_using_event("pointercancel")) remove_pointer_listener("pointercancel")
		if (not_using_event("keydown")) remove_keyboard_listener("keydown")
		if (not_using_event("keypress")) remove_keyboard_listener("keypress")
		if (not_using_event("keyup")) remove_keyboard_listener("keyup")

		// interact is true, but there are no listeners added, cursor should not change on mouseover, but the object should be raycasted / block the raycaster ray.
		obj.userData.block = listeners_counter === -14

		if (!obj.userData.block) {
			if (!remove_interaction_2_listener) {
				// IMPORTANT  needed to dispatch over/out related events if the pointer is not moving and the object enters it!
				// mode "always": scenes are rendered on every animation frame, means over/out checks will also run on every animation frame, "pointermove" -> check_pointer_overout handler not needed!
				// mode "auto": scenes must not be rendered, "pointermove" -> check_pointer_overout handler needed!
				add_interaction_2_listener()
			}

			// IMPORTANT  mode "auto": we need this because we want to check over/out not bound to render interactivity events (not raf aligned)!
			// - the scene must not be rendered in order to dispatch over/out related events
			if ($svelthreeStores[sti].rendererComponent?.mode === "auto")
				c.addEventListener("pointermove", check_pointer_overout)
		} else {
			if (remove_interaction_2_listener) {
				remove_interaction_2_listener()
				remove_interaction_2_listener = null
			}

			if ($svelthreeStores[sti].rendererComponent?.mode === "auto") {
				c.removeEventListener("pointermove", check_pointer_overout)
			}
		}
	}

	$: if (r_remove) remove_all_listeners()

	function remove_all_pointer_listeners(): void {
		for (let i = 0; i < pointer_events.length; i++) {
			remove_pointer_listener(pointer_events[i])
		}
	}

	function remove_all_keyboard_listeners(): void {
		for (let i = 0; i < keyboard_events.length; i++) {
			remove_keyboard_listener(keyboard_events[i])
		}
	}

	function remove_all_listeners(): void {
		if (remove_interaction_2_listener) {
			remove_interaction_2_listener()
			remove_interaction_2_listener = null
		}
		c.removeEventListener("pointermove", check_pointer_overout)
		listeners = false

		remove_all_pointer_listeners()
		pointer_events_queue.length = 0
		obj.userData.block = true

		// SVELTEKIT  SSR  keyboard event listeners are being added to `window`.
		if (browser) {
			remove_all_keyboard_listeners()
			keyboard_events_queue.length = 0
		}
	}

	// disable interaction (reactive)
	$: if (c && raycaster && !interactionEnabled && obj && obj.userData.interact) {
		remove_all_listeners()
		obj.userData.interact = false
	}

	function dispatch_pointer_event(e: PointerEvent): void {
		switch (e.type) {
			case "click":
			case "pointerup":
			case "pointerdown":
				// 'dispatch_on_intersect' events
				if ($svelthreeStores[sti].rendererComponent?.mode === "always") {
					// queue event
					// dispatch event / call handler on next render (raf aligned)
					// IMPORTANT  with mode `always` all (scheduled) events will be canceled / propagation will be stopped
					e.preventDefault()
					e.stopPropagation()
					pointer_events_queue.push(() => dispatch_on_intersect(e))
				} else if ($svelthreeStores[sti].rendererComponent?.mode === "auto") {
					// dispatch event / call handler immediatelly (not raf aligned) any changes will schedule a new render!
					// IMPORTANT  with mode `auto` events will NOT be canceled / propagation will NOT be stopped (NOT scheduled),
					// this also means, that `preventDefault` etc. can / have to be called from inside the handler.
					dispatch_on_intersect(e)
				}
				break
			default:
				// IMPORTANT  `pointermove, `gotpointercapture`, `lostpointercapture` & `pointercancel` events
				// will NOT be canceled / propagation will NOT be stopped (NOT scheduled), this also means that
				// `preventDefault` etc. can / have to be called from inside the handler.
				// TODO  `gotpointercapture`, `lostpointercapture` & `pointercancel` events usage needs to be explored!
				dispatch_always_pointer(e)
				break
		}
	}

	function dispatch_keyboard_event(e: KeyboardEvent): void {
		if ($svelthreeStores[sti].rendererComponent?.mode === "always") {
			// queue event
			// dispatch event / call handler on next render (raf aligned)
			// IMPORTANT  with mode `always` all events will be canceled / propagation will be stopped (scheduled)
			e.preventDefault()
			e.stopPropagation()
			keyboard_events_queue.push(() => {
				dispatch_always_keyboard(e)
			})
		} else if ($svelthreeStores[sti].rendererComponent?.mode === "auto") {
			// dispatch event / call handler immediatelly (not raf aligned) any changes will schedule a new render!
			// IMPORTANT  with mode `auto` events (NOT scheduled) will NOT be canceled / propagation will NOT be stopped,
			// this also means, that `preventDefault` etc. can / have to be called from inside the handler.
			dispatch_always_keyboard(e)
		}
	}

	onMount(() => {
		//if (verbose && log_lc ) console.info(...c_lc_int(c_name, "onMount"))

		return () => {
			if (verbose && log_lc && (log_lc.all || log_lc.om)) console.info(...c_lc_int(c_name, "onDestroy"))
			obj.userData.interact = false
			if (c) remove_all_listeners()
		}
	})

	beforeUpdate(() => {
		//if (verbose && log_lc && (log_lc.all || log_lc.bu)) console.info(...c_lc_int(c_name, "beforeUpdate"))
	})

	afterUpdate(() => {
		//if (verbose && log_lc && (log_lc.all || log_lc.au)) console.info(...c_lc_int(c_name, "afterUpdate"))
	})

	let isOverDispatched = false
	let isOutDispatched = true

	interface RaycasterData {
		/** `intersections` are of the same form as those returned by [`.intersectObject`](https://threejs.org/docs/#api/en/core/Raycaster.intersectObject). */
		intersections: { [P in keyof THREE.Intersection]: THREE.Intersection[P] }
		/** Current `Raycaster` `.ray`, e.g. useful properties: `ray.origin: Vector3` | `ray.direction: Vector3`. */
		ray: THREE.Ray
		/** The `Camera` used for raycasting. */
		camera: THREE.Camera
		/** Current pointer position ( _'point' / Vector3 position_ ) in 3d world space. */
		unprojectedPoint: THREE.Vector3
	}

	let raycasterData: RaycasterData

	function check_pointer_overout(e: PointerEvent) {
		if (intersects()) {
			if (!isOverDispatched) {
				m_dispatch(
					"pointerenter",
					{
						type: "pointerenter",
						target: obj,
						event: e,
						raycasterData
					},
					!!parent.on_pointerenter
				)
				m_dispatch(
					"pointerover",
					{
						type: "pointerover",
						target: obj,
						event: e,
						raycasterData
					},
					!!parent.on_pointerover
				)
				isOverDispatched = true
				isOutDispatched = false
			}
		} else {
			if (!isOutDispatched) {
				m_dispatch(
					"pointerout",
					{
						type: "pointerout",
						target: obj,
						event: e,
						raycasterData
					},
					!!parent.on_pointerout
				)
				m_dispatch(
					"pointerleave",
					{
						type: "pointerleave",
						target: obj,
						event: e,
						raycasterData
					},
					!!parent.on_pointerleave
				)
				isOutDispatched = true
				isOverDispatched = false
			}
		}
	}

	function dispatch_always_pointer(e: PointerEvent) {
		const action_name: string = `on_${e.type}`

		if (has_on_directive(e.type)) dispatch(e.type, { event: e, target: obj, unprojected: pointer.unprojected })
		if (has_prop_action(action_name)) {
			parent[action_name](
				new CustomEvent(e.type, {
					detail: {
						event: e,
						target: obj,
						unprojected: pointer.unprojected
					}
				})
			)
		}
	}

	function dispatch_always_keyboard(e: KeyboardEvent) {
		const action_name: string = `on_${e.type}`

		if (has_on_directive(e.type)) dispatch(e.type, { code: e.code, event: e, target: obj })
		if (has_prop_action(action_name)) {
			parent[action_name](
				new CustomEvent(e.type, {
					detail: {
						code: e.code,
						event: e,
						target: obj
					}
				})
			)
		}
	}

	function dispatch_on_intersect(e: PointerEvent) {
		if (intersects()) {
			e.type === "click" ? do_dispatch(e, !!parent.on_click) : null
			e.type === "pointerup" ? do_dispatch(e, !!parent.on_pointerup) : null
			e.type === "pointerdown" ? do_dispatch(e, !!parent.on_pointerdown) : null
		}
	}

	function do_dispatch(e: PointerEvent, fire_prop_action: boolean): void {
		const message: string = e.type
		const details = { type: e.type, target: obj, event: e, raycasterData }

		m_dispatch(message, details, fire_prop_action)
	}

	function m_dispatch(message: string, details: { [key: string]: any }, fire_prop_action: boolean): void {
		if (has_on_directive(message)) dispatch(message, details)

		if (fire_prop_action) {
			let event = new CustomEvent(message, { detail: details })
			const action_name: string = `on_${message}`
			on_action(event, action_name)
		}
	}

	function intersects(): boolean {
		if (all_intersections) {
			if (all_intersections.result.length && all_intersections.result[0].object === obj) {
				raycasterData = {
					intersections: all_intersections.result[0],
					ray: raycaster.ray,
					camera: raycaster.camera,
					unprojectedPoint: new Vector3(pointer.pos.x, pointer.pos.y, 0).unproject(raycaster.camera)
				}

				return true
			} else {
				return false
			}
		} else {
			return false
		}
	}

	// --- Internal Actions ---

	function on_action(e: CustomEvent, action_name: string) {
		if (verbose && log_dev) console.debug(...c_dev(c_name, `(internal) ${action_name}!`, { e }))
		typeof parent[action_name] === "function"
			? parent[action_name](e)
			: console.error(
					`SVELTHREE > SvelthreeInteraction : provided '${action_name}' object is not a valid function!`
			  )
	}
</script>
