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

	let c: HTMLElement
	$: c = $canvas_dom.element

	let pointer_listeners: boolean = false

	$: if (c && raycaster && interactionEnabled && obj && !obj.userData.interact) {
		obj.userData.interact = true
		pointer_listeners = true
	}

	let out_of_canvas_triggered: boolean = false

	$: if (obj.userData.interact && $pointer_over_canvas.status === false) {
		if (!out_of_canvas_triggered) {
			out_of_canvas_triggered = true
			// detect if pointer is out of canvas and fire pointer out/leave events if needed.
			if (!obj.userData.block) {
				check_overout(pointer.event)
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
		remove_interaction_2_listener = $svelthreeStores[sti].rendererComponent.$on("interaction_2", () =>
			pointer.event ? checkPointer(pointer.event) : null
		)
	}

	// e will always be `pointermove` event!
	function checkPointer(e: PointerEvent): void {
		check_overout(e)
		try_dispatch(e)

		for (let i = 0; i < pointer_events_queue.length; i++) {
			pointer_events_queue[i]()
		}

		pointer_events_queue.length = 0
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

	function using_pointer_event(event_name: string): boolean {
		return has_on_directive(event_name) || parent[`on_${event_name}`]
	}

	function not_using_pointer_event(event_name: string): boolean {
		return !has_on_directive(event_name) && !parent[`on_${event_name}`]
	}

	let listeners_counter = 0

	function add_listener(event_name: string, capture: boolean = false): void {
		//console.log(`SVELTHREE > ${c_name} > add '${event_name}' listener!`)
		c.addEventListener(event_name, try_dispatch, capture)
	}

	function remove_listener(event_name: string): void {
		//console.log(`SVELTHREE > ${c_name} > remove '${event_name}' listener!`)
		c.removeEventListener(event_name, try_dispatch)
		listeners_counter--
	}

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
	$: r_add = interactionEnabled && pointer_listeners
	$: r_remove = !interactionEnabled && pointer_listeners

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

	$: if (r_add || (callbacks && interactionEnabled)) {
		listeners_counter = 0

		if (using_pointer_event("click")) add_listener("click")
		if (using_pointer_event("pointerup")) add_listener("pointerup")
		if (using_pointer_event("pointerdown")) add_listener("pointerdown")
		if (using_pointer_event("gotpointercapture")) add_listener("gotpointercapture")
		if (using_pointer_event("lostpointercapture")) add_listener("lostpointercapture")
		if (using_pointer_event("pointercancel")) add_listener("pointercancel")

		if (not_using_pointer_event("click")) remove_listener("click")
		if (not_using_pointer_event("pointerup")) remove_listener("pointerup")
		if (not_using_pointer_event("pointerdown")) remove_listener("pointerdown")
		if (not_using_pointer_event("pointerover")) listeners_counter--
		if (not_using_pointer_event("pointerout")) listeners_counter--
		if (not_using_pointer_event("pointerenter")) listeners_counter--
		if (not_using_pointer_event("pointerleave")) listeners_counter--
		if (not_using_pointer_event("pointermove")) listeners_counter--
		if (not_using_pointer_event("gotpointercapture")) remove_listener("gotpointercapture")
		if (not_using_pointer_event("lostpointercapture")) remove_listener("lostpointercapture")
		if (not_using_pointer_event("pointercancel")) remove_listener("pointercancel")

		// interact is true, but there are listeners added, cursor should not chang on mouseover, but object should be raycasted.
		obj.userData.block = listeners_counter === -11

		if (obj.userData.block) {
			if ($svelthreeStores[sti].rendererComponent?.mode === "always" && remove_interaction_2_listener) {
				remove_interaction_2_listener()
				remove_interaction_2_listener = null
			}

			if (
				$svelthreeStores[sti].rendererComponent?.mode === "auto" ||
				$svelthreeStores[sti].rendererComponent?.mode === "once"
			) {
				c.removeEventListener("pointermove", check_overout)
			}
		} else {
			if ($svelthreeStores[sti].rendererComponent?.mode === "always" && !remove_interaction_2_listener) {
				add_interaction_2_listener()
			}

			if (
				$svelthreeStores[sti].rendererComponent?.mode === "auto" ||
				$svelthreeStores[sti].rendererComponent?.mode === "once"
			) {
				c.addEventListener("pointermove", check_overout, false)
			}
		}
	}

	$: if (r_remove) remove_all_listeners()

	function remove_all_pointer_listeners(): void {
		for (let i = 0; i < pointer_events.length; i++) {
			remove_listener(pointer_events[i])
		}
	}

	function remove_all_listeners(): void {
		if (remove_interaction_2_listener) {
			remove_interaction_2_listener()
			remove_interaction_2_listener = null
		}
		c.removeEventListener("pointermove", check_overout)

		remove_all_pointer_listeners()
		pointer_listeners = false
		pointer_events_queue.length = 0
		obj.userData.block = true
	}

	// disable interaction (reactive)
	$: if (c && raycaster && !interactionEnabled && obj && obj.userData.interact) {
		remove_all_listeners()
		obj.userData.interact = false
	}

	function try_dispatch(e: PointerEvent): void {
		// queue only 'dispatch_on_intersect' events
		switch (e.type) {
			case "click":
			case "pointerup":
			case "pointerdown":
				pointer_events_queue.push(() => dispatch_on_intersect(e))
				break
			default:
				dispatch_always(e)
				break
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

	function check_overout(e: PointerEvent) {
		if (intersects()) {
			const pointerData = { ...e }

			if (!isOverDispatched) {
				m_dispatch(
					"pointerenter",
					{
						type: "pointerenter",
						target: obj,
						pointerData,
						raycasterData
					},
					!!parent.on_pointerenter
				)
				m_dispatch(
					"pointerover",
					{
						type: "pointerover",
						target: obj,
						pointerData,
						raycasterData
					},
					!!parent.on_pointerover
				)
				isOverDispatched = true
				isOutDispatched = false
			}
		} else {
			if (!isOutDispatched) {
				const pointerData = { ...e }

				m_dispatch(
					"pointerout",
					{
						type: "pointerout",
						target: obj,
						pointerData,
						raycasterData
					},
					!!parent.on_pointerout
				)
				m_dispatch(
					"pointerleave",
					{
						type: "pointerleave",
						target: obj,
						pointerData,
						raycasterData
					},
					!!parent.on_pointerleave
				)
				isOutDispatched = true
				isOverDispatched = false
			}
		}
	}

	/*
     Proccess 'pointermove'-event only if parent component has been rendered with an on:pointermove handler
     or if an internal 'onPointerMove'-handler was provided.
     @see https://discord.com/channels/457912077277855764/457912077277855766/728789428729938021
     @see https://svelte.dev/repl/b7d49058463c48cbb1b35cbbe19c184d?version=3.24.0
    */

	function dispatch_always(e: PointerEvent) {
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

	function dispatch_on_intersect(e: PointerEvent) {
		if (intersects()) {
			e.type === "click" ? do_dispatch(e, !!parent.on_click) : null
			e.type === "pointerup" ? do_dispatch(e, !!parent.on_pointerup) : null
			e.type === "pointerdown" ? do_dispatch(e, !!parent.on_pointerdown) : null
		}
	}

	function do_dispatch(e: PointerEvent, fire_prop_action: boolean): void {
		const pointerData = { ...e }
		const message: string = e.type
		const details = { type: e.type, target: obj, pointerData, raycasterData }

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

	// @see https://threejs.org/docs/#api/en/core/Raycaster

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
