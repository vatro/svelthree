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
	import { svelthreeStores } from "../stores"
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

	let c: HTMLElement
	$: c = $canvas_dom.element

	$: if (c) {
		if (raycaster && interactionEnabled && obj && !obj.userData.interact) {
			addListeners()
			obj.userData.interact = true

			if ($svelthreeStores[sti].rendererComponent?.mode === "always") add_interaction_2_listener()

			// 'auto' & 'once' render modes -> check intersections / fire events only if pointer is moving
			if (
				$svelthreeStores[sti].rendererComponent?.mode === "auto" ||
				$svelthreeStores[sti].rendererComponent?.mode === "once"
			) {
				c.addEventListener("pointermove", checkOverOut)
			}
		}
	}

	let remove_interaction_2_listener: () => void

	// animated scenes -> check intersections / fire events on every rendered frame, even if pointer is not moving
	function add_interaction_2_listener(): void {
		remove_interaction_2_listener = $svelthreeStores[sti].rendererComponent.$on("interaction_2", () =>
			pointer.event ? checkPointer(pointer.event) : null
		)
	}

	function checkPointer(e: PointerEvent): void {
		checkOverOut(e)
		tryDispatch(e)
	}

	$: if (!interactionEnabled && obj && obj.userData.interact) {
		removeListeners()
		obj.userData.interact = false
	}

	function addListeners() {
		c.addEventListener("click", tryDispatch, false)
		c.addEventListener("pointerup", tryDispatch, false)
		c.addEventListener("pointerdown", tryDispatch, false)
	}

	function removeListeners() {
		c.removeEventListener("click", tryDispatch)
		c.removeEventListener("pointerup", tryDispatch)
		c.removeEventListener("pointerdown", tryDispatch)
	}

	let checks = {
		click: { check: dispatchOnIntersect },
		pointerup: { check: dispatchOnIntersect },
		pointerdown: { check: dispatchOnIntersect },
		pointermove: { check: dispatchAlways }
	}

	function tryDispatch(e: MouseEvent | PointerEvent): void {
		if (checks.hasOwnProperty(e.type)) {
			checks[e.type].check(e)
		}
	}

	onMount(() => {
		//if (verbose && log_lc ) console.info(...c_lc_int(c_name, "onMount"))

		return () => {
			if (verbose && log_lc && (log_lc.all || log_lc.om)) console.info(...c_lc_int(c_name, "onDestroy"))
			obj.userData.interact = false

			if (c) {
				if (remove_interaction_2_listener) {
					remove_interaction_2_listener()
					remove_interaction_2_listener = null
				}
				c.removeEventListener("pointermove", checkOverOut)
				c.removeEventListener("click", tryDispatch)
				c.removeEventListener("pointerup", tryDispatch)
				c.removeEventListener("pointerdown", tryDispatch)
				c.removeEventListener("pointermove", tryDispatch)
			}
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

	let raycasterData: {}

	function getPointerData(e: PointerEvent | MouseEvent) {
		let pointerData = {
			// PointerEventInit props, see https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent/PointerEvent

			pointerId: 1976 + e["pointerId"],
			width: e["width"],
			height: e["height"],
			pressure: e["pressure"],
			tangentialPressure: e["tangentialPressure"],
			tiltX: e["tangentialPressure"],
			tiltY: e["tiltY"],
			twist: e["twist"],
			pointerType: e["pointerType"],
			isPrimary: e["isPrimary"],

			// without PointerEvent methods

			// MouseEvent props, see https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent
			altKey: e.altKey,
			button: e.button,
			buttons: e.buttons,
			clientX: e.clientX,
			clientY: e.clientY,
			ctrlKey: e.ctrlKey,
			metaKey: e.metaKey,
			movementX: e.movementX,
			movementY: e.movementY,
			offsetX: e.offsetX,
			offsetY: e.offsetY,
			pageX: e.pageX,
			pageY: e.pageY,
			//region: e.region, // doesn't exist on Mouse or PointerEvent, deprecated?
			relatedTarget: e.relatedTarget,
			screenX: e.screenX,
			screenY: e.screenY,
			shiftKey: e.shiftKey,
			//which // not standardized
			//mozPressure // deprecated
			//mozInputSource // not standardized
			//webkitForce // not standardized
			x: e.x, // = clientX
			y: e.y // = clientY

			// without MouseEvent methods
		}

		return pointerData
	}

	/*
     The checkOverOut could maybe also be further optimized to bypass raycaster check one level higher?
     Although we already get very decent performance with high number of interactive objects, the problem is
     this check happens on every pointermove event in every interactive object. Not sure if some distance calculation
     based on for example the bounding box of the mesh would be more performant than simply checking "allIntersections" in
     store like we do at the moment. hmm...
    */
	function checkOverOut(e: PointerEvent) {
		if (intersects()) {
			if (!isOverDispatched) {
				let pointerData = getPointerData(e)

				mDispatch(
					"pointerenter",
					{
						type: "pointerenter",
						target: obj,
						pointerData: pointerData,
						raycasterData: raycasterData
					},
					!!parent.onPointerEnter
				)
				mDispatch(
					"pointerover",
					{
						type: "pointerover",
						target: obj,
						pointerData: pointerData,
						raycasterData: raycasterData
					},
					!!parent.onPointerOver
				)
				isOverDispatched = true
				isOutDispatched = false
			}
		} else {
			if (!isOutDispatched) {
				let pointerData = getPointerData(e)

				mDispatch(
					"pointerout",
					{
						type: "pointerout",
						target: obj,
						pointerData: pointerData,
						raycasterData: raycasterData
					},
					!!parent.onPointerOut
				)
				mDispatch(
					"pointerleave",
					{
						type: "pointerleave",
						target: obj,
						pointerData: pointerData,
						raycasterData: raycasterData
					},
					!!parent.onPointerLeave
				)
				isOutDispatched = true
				isOverDispatched = false
			}
		}
	}

	/*
     Proccess 'pointermove'-event only if parent component has been rendered with an on:click handler
     or if an internal 'onPointerMove'-handler was provided.
     @see https://discord.com/channels/457912077277855764/457912077277855766/728789428729938021
     @see https://svelte.dev/repl/b7d49058463c48cbb1b35cbbe19c184d?version=3.24.0
    */

	function dispatchAlways(e: PointerEvent) {
		Object.keys(parent.$$.callbacks).includes("pointermove")
			? dispatch(e.type, {
					event: e,
					target: obj,
					//unprojected: $svelthreeStores[sti].pointer.unprojected
					unprojected: pointer.unprojected
			  })
			: null

		parent.onPointerMove
			? onPointerMoveAction(
					new CustomEvent(e.type, {
						detail: {
							event: e,
							target: obj,
							//unprojected: $svelthreeStores[sti].pointer.unprojected
							unprojected: pointer.unprojected
						}
					})
			  )
			: null
	}

	function dispatchOnIntersect(e: MouseEvent | PointerEvent) {
		if (intersects()) {
			e.type === "click" ? doDispatch(e, !!parent.onClick) : null
			e.type === "pointerup" ? doDispatch(e, !!parent.onPointerUp) : null
			e.type === "pointerdown" ? doDispatch(e, !!parent.onPointerDown) : null
		}
	}

	function doDispatch(e: MouseEvent | PointerEvent, fireInternal: boolean): void {
		let pointerData = getPointerData(e)
		mDispatch(
			e.type,
			{
				type: e.type,
				target: obj,
				pointerData: pointerData,
				raycasterData: raycasterData
			},
			fireInternal
		)
	}

	function mDispatch(message: string, details: { [key: string]: any }, fireInternal: boolean): void {
		dispatch(message, details)

		if (fireInternal) {
			let event = new CustomEvent(message, { detail: details })
			switch (message) {
				case "click":
					parent.onClick ? onClickAction(event) : null
					break
				case "pointerup":
					parent.onPointerUp ? onPointerUpAction(event) : null
					break
				case "pointerdown":
					parent.onPointerDown ? onPointerDownAction(event) : null
					break
				case "pointerover":
					parent.onPointerOver ? onPointerOverAction(event) : null
					break
				case "pointerout":
					parent.onPointerOut ? onPointerOutAction(event) : null
					break
				case "pointerenter":
					parent.onPointerEnter ? onPointerEnterAction(event) : null
					break
				case "pointerleave":
					parent.onPointerLeave ? onPointerLeaveAction(event) : null
					break
				case "pointermove": // see dispatchAlways(e: PointerEvent)
					break
			}
		}
	}

	// @see https://threejs.org/docs/#api/en/core/Raycaster

	function intersects(): boolean {
		if (all_intersections) {
			if (all_intersections.result.length && all_intersections.result[0].object === obj) {
				let intersects = raycaster.intersectObject(obj)

				raycasterData = {
					intersections: intersects, // [] all intersections
					ray: raycaster.ray, // Ray( origin : Vector3, direction : Vector3 )
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

	function onClickAction(e: CustomEvent): void {
		if (verbose && log_dev) console.debug(...c_dev(c_name, "(internal) onClickAction!", { e }))
		typeof parent.onClick === "function"
			? parent.onClick(e)
			: console.error("SVELTHREE > SvelthreeInteraction : provided 'onClick' object is not a valid function!")
	}

	function onPointerUpAction(e: CustomEvent): void {
		if (verbose && log_dev) console.debug(...c_dev(c_name, "(internal) onPointerUpAction!", { e }))
		typeof parent.onPointerUp === "function"
			? parent.onPointerUp(e)
			: console.error("SVELTHREE > SvelthreeInteraction : provided 'onPointerUp' object is not a function!")
	}

	function onPointerDownAction(e: CustomEvent): void {
		if (verbose && log_dev) console.debug(...c_dev(c_name, "(internal) onPointerDownAction!", { e }))
		typeof parent.onPointerDown === "function"
			? parent.onPointerDown(e)
			: console.error("SVELTHREE > SvelthreeInteraction : provided 'onPointerDown' object is not a function!")
	}

	function onPointerOverAction(e: CustomEvent): void {
		if (verbose && log_dev) console.debug(...c_dev(c_name, "(internal) onPointerOverAction!", { e }))
		typeof parent.onPointerOver === "function"
			? parent.onPointerOver(e)
			: console.error("SVELTHREE > SvelthreeInteraction : provided 'onPointerOver' object is not a function!")
	}

	function onPointerOutAction(e: CustomEvent): void {
		if (verbose && log_dev) console.debug(...c_dev(c_name, "(internal) onPointerOutAction!", { e }))
		typeof parent.onPointerOut === "function"
			? parent.onPointerOut(e)
			: console.error("SVELTHREE > SvelthreeInteraction : provided 'onPointerOut' object is not a function!")
	}

	function onPointerEnterAction(e: CustomEvent): void {
		if (verbose && log_dev) console.debug(...c_dev(c_name, "(internal) onPointerEnterAction!", { e }))
		typeof parent.onPointerEnter === "function"
			? parent.onPointerEnter(e)
			: console.error("SVELTHREE > SvelthreeInteraction : provided 'onPointerEnter' object is not a function!")
	}

	function onPointerLeaveAction(e: CustomEvent): void {
		if (verbose && log_dev) console.debug(...c_dev(c_name, "(internal) onPointerLeaveAction!", { e }))
		typeof parent.onPointerLeave === "function"
			? parent.onPointerLeave(e)
			: console.error("SVELTHREE > SvelthreeInteraction : provided 'onPointerLeave' object is not a function!")
	}

	function onPointerMoveAction(e: CustomEvent): void {
		if (verbose && log_dev) console.debug(...c_dev(c_name, "(internal) onPointerMoveAction!", { e }))
		typeof parent.onPointerMove === "function"
			? parent.onPointerMove(e)
			: console.error("SVELTHREE > SvelthreeInteraction : provided 'onPointerMove' object is not a function!")
	}
</script>
