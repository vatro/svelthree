<!--
`accessors:true` hast to be set per component because of the svelte-language-server bug, otherwise accessors would be falsely detected as missing and highlighted as errors.
svelthree uses svelte-accmod, where accessors are always `true`, regardless of `svelte:options`.  
-->
<svelte:options accessors />

<!-- 
@component
This is a **svelthree** _SvelthreeInteractionAR_ Component.  
 TODO  Link to Docs.
-->
<script lang="ts">
	import { onMount, beforeUpdate, afterUpdate } from "svelte"
	import { get_current_component, SvelteComponentDev } from "svelte/internal"
	import type { Group, Object3D } from "three"
	import { XRDefaults } from "../constants"
	import { svelthreeStores } from "../stores"
	import { c_rs_int, c_dev, c_lc_int, c_mau, verbose_mode, get_comp_name_int } from "../utils/SvelthreeLogger"
	import type { LogLC, LogDEV } from "../utils/SvelthreeLogger"

	const c_name = get_comp_name_int(get_current_component())
	const verbose: boolean = verbose_mode()

	export let log_dev: { [P in keyof LogDEV]: LogDEV[P] } = undefined
	export let log_rs: boolean = false
	export let log_lc: { [P in keyof LogLC]: LogLC[P] } = undefined
	export let log_mau: boolean = false

	export let interactionEnabled: boolean
	export let parent: SvelteComponentDev
	export let sti: number
	export let obj: Object3D

	export let dispatch: (type: string, detail?: any) => void

	let controller: Group
	$: controller = $svelthreeStores[sti].xr.controller

	// TODO  Months later: What?! Remove?
	/*
    $: if($svelthreeStores[sti].xr.controller) {
        console.debug("run 14!")
        controller = $svelthreeStores[sti].xr.controller
    }
    */

	$: if (controller) {
		if (interactionEnabled && obj && !obj.userData.interact) {
			requestAnimationFrame(() => addListeners())
			obj.userData.interact = true
		} else if (!interactionEnabled && obj && obj.userData.interact) {
			removeListeners()
			obj.userData.interact = false
		}
	}

	function addListeners() {
		controller.addEventListener("select", tryDispatch)
		controller.addEventListener("selectstart", tryDispatch)
		controller.addEventListener("selectend", tryDispatch)
	}

	function removeListeners() {
		controller.removeEventListener("select", tryDispatch)
		controller.removeEventListener("selectstart", tryDispatch)
		controller.removeEventListener("selectend", tryDispatch)
	}

	let checks = {
		select: { check: dispatchOnIntersect },
		selectstart: { check: dispatchOnIntersect },
		selectend: { check: dispatchOnIntersect }
	}

	// TODO  Event Type should be XRInputSourceEvent, but it isn't, because WebXRManager event propagation
	//function tryDispatch(e:XRInputSourceEvent): void {
	//e : {type, target}
	function tryDispatch(e: THREE.Event): void {
		if (checks.hasOwnProperty(e.type)) {
			checks[e.type].check(e)
		}
	}

	onMount(() => {
		if (verbose && log_lc && (log_lc.all || log_lc.om)) console.info(...c_lc_int(c_name, "onMount"))

		return () => {
			if (verbose && log_lc) console.info(...c_lc_int(c_name, "onDestroy"))
			obj.userData.interact = false

			if (controller) {
				controller.removeEventListener("select", tryDispatch)
				controller.removeEventListener("selectstart", tryDispatch)
				controller.removeEventListener("selectend", tryDispatch)
			}
		}
	})

	beforeUpdate(() => {
		//if (verbose && log_lc && (log_lc.all || log_lc.bu)) console.info(...c_lc_int(c_name, "beforeUpdate"))
	})

	afterUpdate(() => {
		//if (verbose && log_lc && (log_lc.all || log_lc.au)) console.info(...c_lc_int(c_name, "afterUpdate"))
	})

	// TODO  Event Type should be XRInputSourceEvent, but it isn't, because WebXRManager event propagation
	//function dispatchOnIntersect(e:XRInputSourceEvent): void {
	//e : {type, target}
	function dispatchOnIntersect(e: THREE.Event) {
		if (checkIntersect()) {
			e.type === "select" ? doDispatch(e, !!parent.onSelect) : null
			e.type === "selectstart" ? doDispatch(e, !!parent.onSelectStart) : null
			e.type === "selectend" ? doDispatch(e, !!parent.onSelectEnd) : null
		}
	}

	// TODO  Event Type should be XRInputSourceEvent, but it isn't, because WebXRManager event propagation
	//function doDispatch(e: XRInputSourceEvent, fireInternal: boolean): void {
	//e : {type, target}
	function doDispatch(e: THREE.Event, fireInternal: boolean): void {
		mDispatch(
			e.type,
			{
				type: e.type,
				target: obj
				//frame: e.frame,
				//inputSource: e.inputSource
			},
			fireInternal
		)
	}

	function mDispatch(message: string, details: { [key: string]: any }, fireInternal: boolean): void {
		dispatch(message, details)

		if (fireInternal) {
			let event = new CustomEvent(message, { detail: details })
			switch (message) {
				case "select":
					parent.onSelect ? onSelectAction(event) : null
					break
				case "selectstart":
					parent.onSelectStart ? onSelectStartAction(event) : null
					break
				case "selectend":
					parent.onSelectEnd ? onSelectEndAction(event) : null
					break
				default:
					break
			}
		}
	}

	function checkIntersect(): boolean {
		if (
			$svelthreeStores[sti].xr.hitTestMode === XRDefaults.HITTEST_MODE_VIRTUAL &&
			$svelthreeStores[sti].allIntersections
		) {
			if (
				$svelthreeStores[sti].allIntersections.length > 0 &&
				$svelthreeStores[sti].allIntersections[0].object === obj
			) {
				return true
			}

			return false
		} else {
			return false
		}
	}

	// --- Internal Actions ---

	function onSelectAction(e: CustomEvent): void {
		if (verbose && log_dev) console.debug(...c_dev(c_name, "(internal) onSelectAction!", { e }))
		typeof parent.onSelect === "function"
			? parent.onSelect(e)
			: console.error("SVELTHREE > SvelthreeInteractionXR : provided 'onSelect' object is not a valid function!")
	}

	function onSelectStartAction(e: CustomEvent): void {
		if (verbose && log_dev) console.debug(...c_dev(c_name, "(internal) onSelectStartAction!", { e }))
		typeof parent.onSelectStart === "function"
			? parent.onSelectStart(e)
			: console.error(
					"SVELTHREE > SvelthreeInteractionXR : provided 'onSelectStart' object is not a valid function!"
			  )
	}

	function onSelectEndAction(e: CustomEvent): void {
		if (verbose && log_dev) console.debug(...c_dev(c_name, "(internal) onSelectEndAction!", { e }))
		typeof parent.onSelectEnd === "function"
			? parent.onSelectEnd(e)
			: console.error(
					"SVELTHREE > SvelthreeInteractionXR : provided 'onSelectEnd' object is not a valid function!"
			  )
	}
</script>
