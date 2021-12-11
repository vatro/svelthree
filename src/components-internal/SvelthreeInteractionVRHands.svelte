<!--
`accessors:true` hast to be set per component because of the svelte-language-server bug, otherwise accessors would be falsely detected as missing and highlighted as errors.
svelthree uses svelte-accmod, where accessors are always `true`, regardless of `svelte:options`.  
-->
<svelte:options accessors />

<!-- 
@component
This is a **svelthree** _SvelthreeInteractionVRHands_ Component.  
[ tbd ]  Link to Docs.
-->
<script lang="ts">
	import { onMount, beforeUpdate, afterUpdate } from "svelte"
	import { get_current_component, SvelteComponentDev } from "svelte/internal"
	import type { Group, Object3D, WebGLRenderer, WebXRManager } from "three"
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

	export let pinchRemote: boolean = undefined
	export let pinchTouch: boolean = undefined
	export let pinchHybrid: boolean = undefined
	export let xrHandTouch: boolean = undefined

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

	// TOFIX  missing xr.getControllers() see https://github.com/mrdoob/three.js/pull/21815
	$: if ($svelthreeStores[sti].renderer.xr.getControllers().length > 0) {
		controllersTotal = $svelthreeStores[sti].renderer.xr.getControllers().length
	}

	$: if (controllersTotal) {
		applyListeners()
	}

	$: if (interactionEnabled) {
		applyListeners()
	}

	function applyListeners() {
		if (interactionEnabled && obj && !obj.userData.interact) {
			addListeners()
			obj.userData.interact = true
		} else if (!interactionEnabled && obj && obj.userData.interact) {
			removeListeners()
			obj.userData.interact = false
		}
	}

	function addListeners() {
		for (let i = 0; i < controllersTotal; i++) {
			let handSpace: Group = webXRManager.getHand(i)
			if (pinchRemote || pinchTouch || pinchHybrid) {
				handSpace.addEventListener("pinchstart", dispatchVRHandsInteractionEvent)
				handSpace.addEventListener("pinchend", dispatchVRHandsInteractionEvent)
			}

			if (xrHandTouch) {
				handSpace.addEventListener("touch", dispatchVRHandsInteractionEvent)
				handSpace.addEventListener("untouch", dispatchVRHandsInteractionEvent)
				handSpace.addEventListener("touchthrough", dispatchVRHandsInteractionEvent)
				handSpace.addEventListener("scratch", dispatchVRHandsInteractionEvent)
			}
		}
	}

	function onXRHandTouch(e) {}

	function removeListeners() {
		// Check if renderer is available, otherwise we get an error when trying to call $svelthreeStores[sti].renderer.xr.getHand(i)
		if (renderer) {
			for (let i = 0; i < controllersTotal; i++) {
				let handSpace = webXRManager.getHand(i)
				//hands
				handSpace.removeEventListener("pinchstart", dispatchVRHandsInteractionEvent)
				handSpace.removeEventListener("pinchend", dispatchVRHandsInteractionEvent)
				handSpace.removeEventListener("touch", dispatchVRHandsInteractionEvent)
				handSpace.removeEventListener("untouch", dispatchVRHandsInteractionEvent)
				handSpace.removeEventListener("touchthrough", dispatchVRHandsInteractionEvent)
				handSpace.removeEventListener("scratch", dispatchVRHandsInteractionEvent)
			}
		}
	}

	let checks = {
		pinchstart: { check: differPinch },
		pinchend: { check: differPinch },
		touch: { check: differTouch },
		untouch: { check: differTouch },
		touchthrough: { check: differTouch },
		scratch: { check: differTouch }
	}

	// TODO  Event Type should be XRInputSourceEvent, but it isn't, because WebXRManager event propagation
	//function tryDispatch(e:XRInputSourceEvent): void {
	//e : {type, target}
	function dispatchVRHandsInteractionEvent(e: THREE.Event): void {
		if (checks.hasOwnProperty(e.type)) {
			checks[e.type].check(e)
		}
	}

	function differPinch(e: THREE.Event): void {
		if ($svelthreeStores[sti].xr.enablePinch) {
			if (pinchRemote) {
				tryDispatchRemotePinch(e)
			}
			if (pinchTouch) {
				tryDispatchTouchPinch(e)
			}
			if (pinchHybrid) {
				tryDispatchHybridPinch(e)
			}
		}
	}

	function differTouch(e: THREE.Event): void {
		if ($svelthreeStores[sti].xr.enablePinch) {
			if (pinchRemote) {
				tryDispatchRemotePinch(e)
			}
			if (pinchTouch) {
				tryDispatchTouchPinch(e)
			}
			if (pinchHybrid) {
				tryDispatchHybridPinch(e)
			}
		}
	}

	function tryDispatchRemotePinch(e: THREE.Event) {
		let pinchEvent = e

		let pinchDistanceLimit = e.target.userData.pinchRayLength

		if (e.target.userData.pinchObject) {
			if (e.target.userData.pinchObject === obj && e.target.userData.pinchDistance > pinchDistanceLimit) {
				switch (e.type) {
					case "pinchstart":
						pinchEvent.type = "pinchremotestart"
						doDispatch(pinchEvent, !!parent.onPinchRemoteStart)
						break
					case "pinchend":
						pinchEvent.type = "pinchremoteend"
						doDispatch(pinchEvent, !!parent.onPinchRemoteEnd)
						break
				}
			}
		}
	}

	function tryDispatchTouchPinch(e: THREE.Event) {
		let pinchEvent = e

		let pinchDistanceLimit = e.target.userData.pinchRayLength + 0.01 // DEFAULT
		e.target.userData.pinchConfig.distance.touch
			? (pinchDistanceLimit = e.target.userData.pinchRayLength + e.target.userData.pinchConfig.distance.touch)
			: null

		if (e.target.userData.pinchObject) {
			if (e.target.userData.pinchObject === obj && e.target.userData.pinchDistance <= pinchDistanceLimit) {
				switch (e.type) {
					case "pinchstart":
						pinchEvent.type = "pinchtouchstart"
						doDispatch(pinchEvent, !!parent.onPinchTouchStart)
						break
					case "pinchend":
						pinchEvent.type = "pinchtouchend"
						doDispatch(pinchEvent, !!parent.onPinchTouchEnd)
						break
				}
			}
		}
	}

	function tryDispatchHybridPinch(e: THREE.Event) {
		let pinchEvent = e

		let pinchDistanceLimit = e.target.userData.pinchRayLength + 0.01 // DEFAULT
		e.target.userData.pinchConfig.distance.touch
			? (pinchDistanceLimit = e.target.userData.pinchRayLength + e.target.userData.pinchConfig.distance.touch)
			: null

		if (e.target.userData.pinchObject) {
			if (e.target.userData.pinchObject === obj) {
				// if doesn't touch dispatch remote
				if (e.target.userData.pinchDistance > pinchDistanceLimit) {
					switch (e.type) {
						case "pinchstart":
							pinchEvent.type = "pinchremotestart"
							doDispatch(pinchEvent, !!parent.onPinchRemoteStart)
							break
						case "pinchend":
							pinchEvent.type = "pinchremoteend"
							doDispatch(pinchEvent, !!parent.onPinchRemoteEnd)
							break
					}
				}
				// if touches dispatch touch
				else {
					switch (e.type) {
						case "pinchstart":
							pinchEvent.type = "pinchtouchstart"
							doDispatch(pinchEvent, !!parent.onPinchTouchStart)
							break
						case "pinchend":
							pinchEvent.type = "pinchtouchend"
							doDispatch(pinchEvent, !!parent.onPinchTouchEnd)
							break
					}
				}
			}
		}
	}

	onMount(() => {
		if (verbose && log_lc && (log_lc.all || log_lc.om)) console.info(...c_lc_int(c_name, "onMount"))

		return () => {
			if (verbose && log_lc) console.info(...c_lc_int(c_name, "onDestroy"))
			obj.userData.interact = false
			removeListeners()
		}
	})

	beforeUpdate(() => {
		//if (verbose && log_lc && (log_lc.all || log_lc.bu)) console.info(...c_lc_int(c_name, "beforeUpdate"))
	})

	afterUpdate(() => {
		//if (verbose && log_lc && (log_lc.all || log_lc.au)) console.info(...c_lc_int(c_name, "afterUpdate"))
	})

	//  TODO  Event Type should be XRInputSourceEvent, but it isn't, because WebXRManager event propagation
	//function doDispatch(e: XRInputSourceEvent, fireInternal: boolean): void {
	//e : {type, target}
	function doDispatch(e: THREE.Event, fireInternal: boolean): void {
		mDispatch(
			e.type,
			{
				type: e.type,
				obj: obj,
				target: e.target,
				handedness: e.handedness // TODO  examine: wehen using controller-mode 'handedness' is not a first level property
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
				case "pinchstart":
					parent.onPinchStart ? onPinchStartAction(event) : null
					break
				case "pinchend":
					parent.onPinchEnd ? onPinchEndAction(event) : null
					break
				case "pinchremotestart":
					parent.onPinchRemoteStart ? onPinchRemoteStartAction(event) : null
					break
				case "pinchremoteeend":
					parent.onPinchEnd ? onPinchRemoteEndAction(event) : null
					break
				case "pinchtouchstart":
					parent.onPinchTouchStart ? onPinchTouchStartAction(event) : null
					break
				case "pinchtouchend":
					parent.onPinchTouchEnd ? onPinchTouchEndAction(event) : null
					break
				default:
					break
			}
		}
	}

	// --- Internal Actions ---

	function onPinchStartAction(e: CustomEvent): void {
		if (verbose && log_dev) console.debug(...c_dev(c_name, "(internal) onPinchStartAction!", { e }))
		typeof parent.onPinchStart === "function"
			? parent.onPinchStart(e)
			: console.error(
					"SVELTHREE > SvelthreeInteractionVRHands : provided 'onPinchStart' object is not a valid function!"
			  )
	}

	function onPinchEndAction(e: CustomEvent): void {
		if (verbose && log_dev) console.debug(...c_dev(c_name, "(internal) onPinchEndAction!", { e }))
		typeof parent.onPinchEnd === "function"
			? parent.onPinchEnd(e)
			: console.error(
					"SVELTHREE > SvelthreeInteractionVRHands : provided 'onPinchEnd' object is not a valid function!"
			  )
	}

	function onPinchRemoteStartAction(e: CustomEvent): void {
		if (verbose && log_dev) console.debug(...c_dev(c_name, "(internal) onPinchRemoteStartAction!", { e }))
		typeof parent.onPinchRemoteStart === "function"
			? parent.onPinchRemoteStart(e)
			: console.error(
					"SVELTHREE > SvelthreeInteractionVRHands : provided 'onPinchRemoteStart' object is not a valid function!"
			  )
	}

	function onPinchRemoteEndAction(e: CustomEvent): void {
		if (verbose && log_dev) console.debug(...c_dev(c_name, "(internal) onPinchRemoteEndAction!", { e }))
		typeof parent.onPinchRemoteEnd === "function"
			? parent.onPinchRemoteEnd(e)
			: console.error(
					"SVELTHREE > SvelthreeInteractionVRHands : provided 'onPinchRemoteEnd' object is not a valid function!"
			  )
	}

	function onPinchTouchStartAction(e: CustomEvent): void {
		if (verbose && log_dev) console.debug(...c_dev(c_name, "(internal) onPinchTouchStartAction!", { e }))
		typeof parent.onPinchTouchStart === "function"
			? parent.onPinchTouchStart(e)
			: console.error(
					"SVELTHREE > SvelthreeInteractionVRHands : provided 'onPinchTouchStart' object is not a valid function!"
			  )
	}

	function onPinchTouchEndAction(e: CustomEvent): void {
		if (verbose && log_dev) console.debug(...c_dev(c_name, "(internal) onPinchTouchEndAction!", { e }))
		typeof parent.onPinchTouchEnd === "function"
			? parent.onPinchTouchEnd(e)
			: console.error(
					"SVELTHREE > SvelthreeInteractionVRHands : provided 'onPinchTouchEnd' object is not a valid function!"
			  )
	}

	function onCustomTouchEventAction(e: CustomEvent): void {
		if (verbose && log_dev) console.debug(...c_dev(c_name, "(internal) onCustomTouchEventAction!", { e }))
		typeof parent.onCustomTouchEvent === "function"
			? parent.onCustomTouchEvent(e)
			: console.error(
					"SVELTHREE > SvelthreeInteractionVRHands : provided 'onCustomTouchEvent' object is not a valid function!"
			  )
	}
</script>
