<!-- 
@component
This is a **svelthree** _SvelthreeInteractionVRGrippable_ Component.  
 TODO  Link to Docs.
-->
<script lang="ts">
	import { onMount } from "svelte"
	import type { SvelteComponentDev } from "svelte/internal"
	import type { Group, Object3D, WebGLRenderer, WebXRManager } from "svelthree-three"
	import { svelthreeStores } from "../stores"
	import type { XrControllerEventDetailObj, XrControllerEventType } from "../xr/types-svelthree"

	export let interactionEnabled: boolean
	export let parent: SvelteComponentDev
	export let sti: number
	export let obj: Object3D

	export let dispatch: (type: string, detail?: any) => void

	let controllersTotal: number = undefined

	let renderer: WebGLRenderer

	$: if ($svelthreeStores[sti].renderer) {
		renderer = $svelthreeStores[sti].renderer
	}

	$: if ($svelthreeStores[sti].renderer.xr) {
		webXRManager = $svelthreeStores[sti].renderer.xr
	}

	let webXRManager: WebXRManager

	$: if ($svelthreeStores[sti].renderer.xr) {
		webXRManager = $svelthreeStores[sti].renderer.xr
	}

	$: if ($svelthreeStores[sti].renderer.xr.getControllers().length > 0) {
		controllersTotal = $svelthreeStores[sti].renderer.xr.getControllers().length
	}

	$: if (controllersTotal) {
		applyListeners()
	}

	$: if (interactionEnabled) {
		applyListeners()
	}

	function applyListeners(): void {
		if (interactionEnabled && obj && !obj.userData.interact) {
			addListeners()
			obj.userData.interact = true
		} else if (!interactionEnabled && obj && obj.userData.interact) {
			removeListeners()
			obj.userData.interact = false
		}
	}

	function addListeners(): void {
		for (let i = 0; i < controllersTotal; i++) {
			const targetRaySpace: Group = webXRManager.getController(i)
			addGrippableListenersToSpace(targetRaySpace)

			/*
            const gripSpace: Group = webXRManager.getControllerGrip(i)
            addGrippableListenersToSpace(gripSpace)
            */
		}
	}

	function addGrippableListenersToSpace(space: Group) {
		space.addEventListener("select", dispatchVRGrippableInteractionEvent)
		space.addEventListener("selectstart", dispatchVRGrippableInteractionEvent)
		space.addEventListener("selectend", dispatchVRGrippableInteractionEvent)
		space.addEventListener("squeeze", dispatchVRGrippableInteractionEvent)
		space.addEventListener("squeezestart", dispatchVRGrippableInteractionEvent)
		space.addEventListener("squeezeend", dispatchVRGrippableInteractionEvent)
	}

	function removeListeners(): void {
		for (let i = 0; i < controllersTotal; i++) {
			const targetRaySpace: Group = webXRManager.getController(i)
			removeGrippableListenersFromSpace(targetRaySpace)

			/*
            const gripSpace: Group = webXRManager.getControllerGrip(i)
            removeGrippableListenersFromSpace(gripSpace)
            */
		}
	}

	function removeGrippableListenersFromSpace(space: Group): void {
		space.removeEventListener("select", dispatchVRGrippableInteractionEvent)
		space.removeEventListener("selectstart", dispatchVRGrippableInteractionEvent)
		space.removeEventListener("selectend", dispatchVRGrippableInteractionEvent)
		space.removeEventListener("squeeze", dispatchVRGrippableInteractionEvent)
		space.removeEventListener("squeezestart", dispatchVRGrippableInteractionEvent)
		space.removeEventListener("squeezeend", dispatchVRGrippableInteractionEvent)
	}

	let checks = {
		select: { check: dispatchOnIntersect },
		selectstart: { check: dispatchOnIntersect },
		selectend: { check: dispatchOnIntersect },
		squeeze: { check: dispatchOnIntersect },
		squeezestart: { check: dispatchOnIntersect },
		squeezeend: { check: dispatchOnIntersect }
	}

	//e : {type, target}
	function dispatchVRGrippableInteractionEvent(e: THREE.Event): void {
		if (checks.hasOwnProperty(e.type)) {
			checks[e.type].check(e)
		}
	}

	onMount(() => {
		console.info("SVELTHREE > onMount : SvelthreeInteractionVRGrippable")

		// WHY?  do we have to to this? Without it there is no object-based interaction after switching from
		// controllers --> hands --> controllers
		applyListeners()

		return () => {
			console.info("SVELTHREE > onDestroy : SvelthreeInteractionVRGrippable")

			obj.userData.interact = false
			if (renderer && webXRManager) {
				removeListeners()
			}
		}
	})

	function dispatchOnIntersect(e: THREE.Event): void {
		const eventType: XrControllerEventType = e.type as XrControllerEventType

		if (checkIntersect(e.target.userData.intersections)) {
			eventType === "select" ? doDispatch(e, !!parent.onSelect) : null
			eventType === "selectstart" ? doDispatch(e, !!parent.onSelectStart) : null
			eventType === "selectend" ? doDispatch(e, !!parent.onSelectEnd) : null
			eventType === "squeeze" ? doDispatch(e, !!parent.onSqueeze) : null
			eventType === "squeezestart" ? doDispatch(e, !!parent.onSqueezeEnd) : null
			eventType === "squeezeend" ? doDispatch(e, !!parent.onSqueezeEnd) : null
		}
	}

	function doDispatch(e: THREE.Event, fireInternal: boolean): void {
		const message: XrControllerEventType = e.type as XrControllerEventType

		const detail: XrControllerEventDetailObj = {
			xrInputSource: e.target.userData.xrInputSource, // XRInputSource
			controllerSpace: e.target,
			controllerSpaceType: e.target.userData.spaceType,
			controllerHandedness: e.target.userData.xrInputSource.handedness,
			targetObj: obj
			//frame: e.frame,
			//inputSource: e.inputSource
		}

		mDispatch(message, detail, fireInternal)
	}

	function mDispatch(
		message: XrControllerEventType,
		detail: XrControllerEventDetailObj,
		fireInternal: boolean
	): void {
		dispatch(message, detail)

		if (fireInternal) {
			let event = new CustomEvent(message, { detail: detail })
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
				case "squeeze":
					parent.onSqueeze ? onSqueezeAction(event) : null
					break
				case "squeezestart":
					parent.onSqueezeStart ? onSqueezeStartAction(event) : null
					break
				case "squeezeend":
					parent.onSqueezeEnd ? onSqueezeEndAction(event) : null
					break
				default:
					break
			}
		}
	}

	function checkIntersect(intersections: any[]): boolean {
		if (intersections) {
			if (intersections.length > 0 && intersections[0].object === obj) {
				return true
			}

			return false
		} else {
			return false
		}
	}

	// --- Internal Actions ---

	function onSelectAction(e: CustomEvent): void {
		console.info("SVELTHREE > SvelthreeInteractionVRGrippable :internal onSelectAction!")
		typeof parent.onSelect === "function"
			? parent.onSelect(e)
			: console.error(
					"SVELTHREE > SvelthreeInteractionVRGrippable : provided 'onSelect' object is not a valid function!"
			  )
	}

	function onSelectStartAction(e: CustomEvent): void {
		console.info("SVELTHREE > SvelthreeInteractionVRGrippable :internal onSelectStartAction!")
		typeof parent.onSelectStart === "function"
			? parent.onSelectStart(e)
			: console.error(
					"SVELTHREE > SvelthreeInteractionVRGrippable : provided 'onSelectStart' object is not a valid function!"
			  )
	}

	function onSelectEndAction(e: CustomEvent): void {
		console.info("SVELTHREE > SvelthreeInteractionVRGrippable :internal onSelectEndAction!")
		typeof parent.onSelectEnd === "function"
			? parent.onSelectEnd(e)
			: console.error(
					"SVELTHREE > SvelthreeInteractionVRGrippable : provided 'onSelectEnd' object is not a valid function!"
			  )
	}

	function onSqueezeAction(e: CustomEvent): void {
		console.info("SVELTHREE > SvelthreeInteractionVRGrippable :internal onSqueezeAction!")
		typeof parent.onSqueeze === "function"
			? parent.onSqueeze(e)
			: console.error(
					"SVELTHREE > SvelthreeInteractionVRGrippable : provided 'onSqueeze' object is not a valid function!"
			  )
	}

	function onSqueezeStartAction(e: CustomEvent): void {
		console.info("SVELTHREE > SvelthreeInteractionVRGrippable :internal onSqueezeStartAction!")
		typeof parent.onSqueezeStart === "function"
			? parent.onSqueezeStart(e)
			: console.error(
					"SVELTHREE > SvelthreeInteractionVRGrippable : provided 'onSqueezeStart' object is not a valid function!"
			  )
	}

	function onSqueezeEndAction(e: CustomEvent): void {
		console.info("SVELTHREE > SvelthreeInteractionVRGrippable :internal onSqueezeEndAction!")
		typeof parent.onSqueezeEnd === "function"
			? parent.onSqueezeEnd(e)
			: console.error(
					"SVELTHREE > SvelthreeInteractionVRGrippable : provided 'onSqueezeEnd' object is not a valid function!"
			  )
	}
</script>
