<!-- 
@component
This is a **svelthree** _SessionVR_ Component.  
 TODO  Link to Docs.
-->
<script lang="ts">
	/*
     This started as an adaption of the SessionAR component
     @see https://github.com/mrdoob/three.js/blob/master/examples/jsm/webxr/VRButton.js
     @see https://github.com/mrdoob/three.js/blob/master/examples/webxr_vr_dragging.html (2 controllers)
    */

	import { createEventDispatcher, onMount } from "svelte"
	import type { Group, Object3D, Scene, WebXRManager, XRControllerModel } from "svelthree-three"
	import { XRControllerDefaults, XRDefaults, XRHandTouchDefaults } from "../constants"
	import { svelthreeStores } from "../stores"
	import { SplashVR, SvelthreeHelpersXR, XRHandPinch, XRHandTouchRayExt, XRHandTouchSphereExt } from "../xr"
	import type {
		XrControllerEventDetailSession,
		XrControllerEventSessionDispatcher,
		XrControllerEventType,
		XrControllerEventTypeMissed,
		XrControllerSpaceEvent,
		XrHandEnablePinchResult,
		XrHandEnableTouchResult,
		XrHandPinchConfig,
		XrHandTouchConfig,
		XrHandTouchConfigHands,
		XrHandTouchEvents,
		XrHandTouchXConfig,
		XrHitTestMode,
		XrInputConfigGrippable,
		XrInputConfigHand,
		XrOptionalFeatures,
		XrRequiredFeatures,
		XrSessionVRInputConfig,
		XrSessionVRInputType,
		XrTouchUpdateArgs
	} from "../xr/types-svelthree"
	import type {
		XRFrame,
		XRHandedness,
		XRInputSource,
		XRInputSourceChangeEvent,
		XRSession,
		XRSessionEvent,
		XRSessionMode
	} from "../xr/types-webxr"
	import { XRControllerUtils, XRHandUtils } from "../xr/utils"

	const dispatch: (type: string, detail?: any) => void = createEventDispatcher()

	export let sti: number

	if (sti === undefined) {
		console.warn("SVELTHREE > SessionVR : You have to provide a {sti} prop for the WebGLRenderer component!", {
			sti: sti
		})
		throw new Error("SVELTHREE Exception (see warning above)")
	}

	const sessionMode: XRSessionMode = XRDefaults.SESSION_MODE_VR
	export let requiredFeatures: XrRequiredFeatures[] = undefined
	const hitTestMode: XrHitTestMode = XRDefaults.DEFAULT_VR_XR_HITTEST_MODE
	export let optionalFeatures: XrOptionalFeatures[] = undefined
	export let btnClass: string = undefined
	export let btnTxt: { [key: string]: string } = undefined
	export let domOverlay: HTMLDivElement = undefined
	export let maxControllers: number = XRControllerDefaults.MAX_CONTROLLERS
	export let inputConfig: XrSessionVRInputConfig = undefined
	export let controllerConfig: XrInputConfigGrippable = undefined
	export let enablePinch: XrHandPinchConfig = undefined
	export let enableTouch: XrHandTouchConfig = undefined
	export let touchEvents: XrHandTouchEvents = undefined
	export let enableTouchX: XrHandTouchXConfig = undefined

	// TODO  Refactor SvelthreeHelpersXR / additional helpers
	let xrHelpers: SvelthreeHelpersXR = new SvelthreeHelpersXR()
	export let coords: boolean = false
	export let handHelpers: boolean = false

	$: requiredFeatures ? storeRequiredFeatures() : null

	function storeRequiredFeatures(): void {
		$svelthreeStores[sti].xr.requiredFeatures = [...requiredFeatures]
		//console.warn("SVELTHREE > SessionVR > updateRequiredFeatures: ",$svelthreeStores[sti].xr.requiredFeatures)
	}

	$svelthreeStores[sti].xr.hitTestMode = hitTestMode
	$svelthreeStores[sti].xr.hitTestModeInitial = $svelthreeStores[sti].xr.hitTestMode

	$: optionalFeatures ? storeOptionalFeatures() : null

	function storeOptionalFeatures(): void {
		$svelthreeStores[sti].xr.optionalFeatures = [...optionalFeatures]
		//console.warn("SVELTHREE > SessionVR > updateOptionalFeatures: ", $svelthreeStores[sti].xr.optionalFeatures)
	}

	$: domOverlay ? storeDomOverlay() : null

	function storeDomOverlay(): void {
		$svelthreeStores[sti].xr.domOverlay = domOverlay
		//console.warn("SVELTHREE > SessionVR > storeDomOverlay: ", $svelthreeStores[sti].xr.domOverlay)
	}

	$: inputConfig ? storeInputConfig() : null

	function storeInputConfig(): void {
		$svelthreeStores[sti].xr.inputConfig = inputConfig
		//console.warn("SVELTHREE > SessionVR > storeInputConfig: ",  $svelthreeStores[sti].xr.inputConfig)
	}

	$: controllerConfig ? storeControllerConfig() : null

	function storeControllerConfig(): void {
		$svelthreeStores[sti].xr.controllerConfig = controllerConfig
	}

	/**
	 * This is being changed by controller's 'connected' handlers and is crucial for
	 * mounting / unmounting the correct interactivity components inside the Mesh component.
	 * @see onTargetRaySpaceConnected
	 * @see onHandSpaceConnected
	 */
	let currentVRInputType: XrSessionVRInputType

	$: currentVRInputType ? storeCurrentVRInputType() : null

	function storeCurrentVRInputType(): void {
		$svelthreeStores[sti].xr.currentVRInputType = currentVRInputType
		//console.warn("SVELTHREE > SessionVR > storeCurrentVRInputType: ", $svelthreeStores[sti].xr.currentVRInputType)
	}

	// --------- REACTIVE PINCH Configuration ---------

	$: enablePinch ? storeAndUpdateEnablePinch() : null

	// WHY?  do we store config double and tripple (in the store and in the hands)?
	// ANSWER  Because we're still prototyping and are not yet sure where we'll need this "globally"!
	// RECONSIDER  above / refactor
	function storeAndUpdateEnablePinch(): void {
		console.warn("SVELTHREE > SessionVR > updateEnablePinch!")
		$svelthreeStores[sti].xr.enablePinch = enablePinch

		let updated: XrHandEnablePinchResult = XRHandUtils.applyEnablePinch($svelthreeStores[sti].xr.enablePinch)

		// update store values
		for (const [key, value] of Object.entries(updated)) {
			$svelthreeStores[sti].xr[key] = value
		}

		// TOFIX  it's better to get the hands based on 'xrInputsource.handedness' every time we need them, as we cannot rely they reamin the same
		if (rendererAvailable) {
			const leftHand: Group = getHandSpaceLeft()
			const rightHand: Group = getHandSpaceRight()

			leftHand ? setPinchInteractivity(leftHand) : null
			rightHand ? setPinchInteractivity(rightHand) : null
		}
	}

	// --------- REACTIVE TOUCH Configuration ---------

	$: enableTouch ? sotreAndUpdateEnableTouch() : null

	// WHY?  do we store config double and tripple (in the store and in the hands)?
	// ANSWER  Because we're prototyping and are not yet sure where we'll need this "gloabaly"!
	// TODO  reconsider / refactor above
	function sotreAndUpdateEnableTouch(): void {
		console.warn("SVELTHREE > SessionVR > updateEnableTouch!")
		$svelthreeStores[sti].xr.enableTouch = enableTouch

		let updated: XrHandEnableTouchResult

		if ($svelthreeStores[sti].xr.enableTouch.hands) {
			updated = XRHandUtils.applyEnableTouch($svelthreeStores[sti].xr.enableTouch.hands)
		} else {
			let hands: XrHandTouchConfigHands = XRHandTouchDefaults.ENABLETOUCH_HANDS_DEFAULT
			updated = XRHandUtils.applyEnableTouch(hands)
		}

		// update store values
		for (const [key, value] of Object.entries(updated)) {
			$svelthreeStores[sti].xr[key] = value
		}

		if (rendererAvailable) {
			const leftHand: Group = getHandSpaceLeft()
			const rightHand: Group = getHandSpaceRight()

			leftHand ? setTouchInteractivity(leftHand) : null
			rightHand ? setTouchInteractivity(rightHand) : null
		}
	}

	$: touchEvents ? updateTouchEvents() : null

	function updateTouchEvents(): void {
		console.warn("SVELTHREE > SessionVR > updateTouchEvents!")
		$svelthreeStores[sti].xr.touchEvents = touchEvents

		//renderer is not available on init, so this will not be executed twice, only on reactive update!
		if (rendererAvailable) {
			applyHandTouchEvents()
		}
	}

	$: enableTouchX ? updateEnableTouchX() : null

	function updateEnableTouchX(): void {
		console.warn("SVELTHREE > SessionVR > updateEnableTouchX!")
		$svelthreeStores[sti].xr.enableTouchX = enableTouchX

		// renderer is not available on init, so this will not be executed twice, only on reactive update!
		if (rendererAvailable) {
			applyHandTouchEventsX()
		}
	}

	/*
     CONTROLLER EVENTS: Universal Event dispatcher for controller of input type "controller"
     
     Dispatches CONTROLLER Events from SessionVR's components scope.
      IMPORTANT  In contrast to events being dispatched by interactive intersected Objects, the 'XrControllerEventSession' dispatcher
     will ALWAYS dispatch the event even if the controller target ray doesn't intersect an object.
     @see XRControllerUtils.getRayIntersections is being executed just before dispatching an Event:
    */

	const dispatchControllerEventFromSession = createEventDispatcher<XrControllerEventSessionDispatcher>()

	function dispatchControllerEvent(e: THREE.Event) {
		if ($svelthreeStores[sti].raycaster) {
			let intersections: any[] = []
			let targetObj: Object3D

			if (e.target.userData.spaceType === "targetray") {
				intersections = XRControllerUtils.getRayIntersections(
					$svelthreeStores[sti].raycaster,
					currentScene,
					e.target
				)

				e.target.userData.intersections = intersections
				e.target.userData.intersections.length > 0 ? (targetObj = intersections[0].object) : (targetObj = null)
			} else {
				intersections = null
				targetObj = null
			}

			let eventType: XrControllerEventType | XrControllerEventTypeMissed = e.type as
				| XrControllerEventType
				| XrControllerEventTypeMissed

			if (intersections === []) {
				eventType === "select" ? (eventType = "missed_all_select") : null
				eventType === "squeeze" ? (eventType = "missed_all_squeeze") : null
			} else if (targetObj !== null && targetObj.userData.interact === false) {
				eventType === "select" ? (eventType = "missed_interactive_select") : null
				eventType === "squeeze" ? (eventType = "missed_interactive_squeeze") : null
			}

			const eventDetail: XrControllerEventDetailSession = {
				xrInputSource: e.target.userData.xrInputSource,
				controllerSpace: e.target,
				controllerSpaceType: e.target.userData.spaceType,
				controllerHandedness: e.target.userData.xrInputSource.handedness,
				intersectedObj: targetObj
			}

			dispatchControllerEventFromSession(eventType, eventDetail)
		} else {
			console.error(
				"SVELTHREE > SessionVR > dispatchControllerEvent : Event will not be dispacthed because raycaster is not available! e: ",
				e
			)
		}
	}

	function addHandInteraction(handSpace: Group) {
		prepareHandForInteraction(handSpace)

		enablePinch !== undefined ? setPinchInteractivity(handSpace) : null
		enableTouch !== undefined ? setTouchInteractivity(handSpace) : null

		// TODO  touchEvents
		if (touchEvents !== undefined) {
			applyHandTouchEvents()
		}

		// TODO  enableTouchX
		if (enableTouchX !== undefined) {
			applyHandTouchEventsX()
		}
	}

	// WHY?  do we store config double and tripple (in the store and in the hands)?
	// ANSWER  Because we're prototyping and are not yet sure where we'll need this "globally"!
	// TODO  reconsider / refactor above

	function prepareHandForInteraction(handSpace: Group) {
		XRHandUtils.addName(handSpace)
		XRHandUtils.addUserDataHandedness(handSpace)

		let handInputSource: XRInputSource = handSpace.userData.xrInputSource

		if (handInputSource.handedness === XRControllerDefaults.HANDEDNESS_LEFT) {
			handSpace.userData.pinchEnabled = $svelthreeStores[sti].xr.leftHandPinchEnabled
			handSpace.userData.pinchConfig = $svelthreeStores[sti].xr.leftHandPinchConfig

			handSpace.userData.touchEnabled = $svelthreeStores[sti].xr.leftHandTouchEnabled
			handSpace.userData.touchEnabledJoints = $svelthreeStores[sti].xr.leftHandTouchEnabledJoints
		}

		if (handInputSource.handedness === XRControllerDefaults.HANDEDNESS_RIGHT) {
			handSpace.userData.pinchEnabled = $svelthreeStores[sti].xr.rightHandPinchEnabled
			handSpace.userData.pinchConfig = $svelthreeStores[sti].xr.rightHandPinchConfig

			handSpace.userData.touchEnabled = $svelthreeStores[sti].xr.rightHandTouchEnabled
			handSpace.userData.touchEnabledJoints = $svelthreeStores[sti].xr.rightHandTouchEnabledJoints
		}
	}

	// PINCH INTERACTIVITY

	function setPinchInteractivity(handSpace: Group) {
		if (handSpace.userData.pinchEnabled) {
			XRHandUtils.PINCH.addListeners(handSpace, dispatchHandPinchEvent)

			doUpdatePinchRays = true
		} else {
			removePinchInteractivity(handSpace)
		}
	}

	function removePinchInteractivity(handSpace: Group) {
		XRHandUtils.PINCH.removeListeners(handSpace, dispatchHandPinchEvent)
		verifyXRPinchUpdating()
	}

	function verifyXRPinchUpdating() {
		const leftHand: Group = getHandSpaceLeft()
		const rightHand: Group = getHandSpaceRight()

		if (leftHand.userData.pinchEnabled === false && rightHand.userData.pinchEnabled === false) {
			doUpdatePinchRays = false
		}
	}

	// TOUCH INTERACTIVITY

	function setTouchInteractivity(handSpace: Group) {
		if (handSpace.userData.touchEnabled) {
			XRHandUtils.TOUCH.addListeners(handSpace, dispatchHandTouchEvent)

			doUpdateXRTouch = true
		} else {
			removeTouchInteractivity(handSpace)
		}
	}

	function removeTouchInteractivity(handSpace: Group) {
		XRHandUtils.TOUCH.removeListeners(handSpace, dispatchHandTouchEvent)
		verifyXRTouchUpdating()
	}

	function verifyXRTouchUpdating() {
		const leftHand: Group = getHandSpaceLeft()
		const rightHand: Group = getHandSpaceRight()

		if (leftHand && !rightHand) {
			if (leftHand.userData.touchEnabled === false) {
				doUpdateXRTouch = false
			}
		} else if (!leftHand && rightHand) {
			if (rightHand.userData.touchEnabled === false) {
				doUpdateXRTouch = false
			}
		} else if (leftHand && rightHand) {
			if (leftHand.userData.touchEnabled === false && rightHand.userData.touchEnabled === false) {
				doUpdateXRTouch = false
			}
		}
	}

	function applyHandTouchEvents() {
		const leftHand: Group = getHandSpaceLeft()
		const rightHand: Group = getHandSpaceRight()

		XRHandUtils.TOUCH.applyEvents(leftHand, rightHand, $svelthreeStores[sti].xr.touchEvents, dispatchHandTouchEvent)
	}

	// TOUCHX INTERACTIVITY

	function applyHandTouchEventsX() {
		const leftHand: Group = getHandSpaceLeft()
		const rightHand: Group = getHandSpaceRight()

		XRHandUtils.TOUCHX.applyEventsX(
			leftHand,
			rightHand,
			$svelthreeStores[sti].xr.enableTouchX,
			dispatchHandTouchEventX
		)
	}

	/*
     CLEAN UP SessionVR scoped HAND Listeners
     @see showEnterVR.onSessionEnded
    */
	async function removeHandsInteractivity(): Promise<void> {
		for (let i = 0; i < $svelthreeStores[sti].xr.controllers.length; i++) {
			let hand = $svelthreeStores[sti].renderer.xr.getHand(i)

			if (hand) {
				XRHandUtils.PINCH.removeListeners(hand, dispatchHandPinchEvent)
				XRHandUtils.TOUCH.removeListeners(hand, dispatchHandTouchEvent)

				XRHandUtils.TOUCH.unregisterEvents(hand)
				XRHandUtils.TOUCHX.unregisterEventsX(hand)
			}
		}

		doUpdatePinchRays = false
		doUpdateXRTouch = false
	}

	// -------------------------------------------

	// --------- SessionVR SCOPED EVENTS ---------

	/*
     Dispatches PINCH Events from SessionVR's components scope
      WHY?  This way we can listen to pinch events "globaly", not just if a pichable object was piched
    */
	function dispatchHandPinchEvent(e: THREE.Event) {
		console.warn("SVELTHREE > SessionVR > dispatchHandPinchEvent : (global) PINCH EVENT! --> ", e.type)

		// TODO  EVENTS: check event TYPE and detail / refine
		dispatch(e.type, { handedness: e.handedness, target: e.target })
	}

	/*
     Dispatches TOUCH Events from SessionVR's components scope
      WHY?  This way we can define "global" pinch events, not just if a pichable object was piched
    */
	function dispatchHandTouchEvent(e: THREE.Event) {
		console.warn("SVELTHREE > SessionVR > dispatchHandTouchEvent : (global) TOUCH EVENT! --> ", e.type)

		// TODO  EVENTS: check event TYPE and detail / refine
		dispatch(e.type, { handedness: e.handedness, target: e.target })
	}

	/*
     Dispatches TOUCHX Events from SessionVR's components scope
      WHY?  This way we can listen to pinch events "globaly", not just if a pichable object was piched
    */
	function dispatchHandTouchEventX(e: THREE.Event) {
		console.warn("SVELTHREE > SessionVR > dispatchHandTouchEventX : (global) TOUCHX EVENT! --> ", e.type)

		// TODO  EVENTS: check event TYPE and detail / refine
		dispatch(e.type, { handedness: e.handedness, target: e.target })
	}

	// ----------------------------------

	// --------- XRFrame Update ---------

	let xrHandPinch: XRHandPinch
	let xrHandTouchRay: XRHandTouchRayExt
	let xrHandTouchSphere: XRHandTouchSphereExt

	let doUpdatePinchRays = false
	let doUpdateXRTouch = false

	// TODO  this smells a bit like bottleneck, check!
	let xrFrame: XRFrame
	$: xrFrame = $svelthreeStores[sti].xr.currentFrame.frame
	$: xrFrame ? onXRFrame() : null

	function onXRFrame() {
		doUpdatePinchRays ? updatePinchRays() : null
		doUpdateXRTouch ? updateXRTouch() : null
	}

	// ----------------------------------

	// --------- UPDATING PINCH ---------

	function updatePinchRays(): void {
		const leftHand: Group = getHandSpaceLeft()
		const rightHand: Group = getHandSpaceRight()

		if (leftHand && leftHand.userData.pinchEnabled) {
			xrHandPinch === undefined ? createXRHandPinchInstance() : null
			xrHandPinch.updatePinchRay(leftHand, currentScene, $svelthreeStores[sti].raycaster)
		}

		if (rightHand && rightHand.userData.pinchEnabled) {
			xrHandPinch === undefined ? createXRHandPinchInstance() : null
			xrHandPinch.updatePinchRay(rightHand, currentScene, $svelthreeStores[sti].raycaster)
		}
	}

	function createXRHandPinchInstance() {
		xrHandPinch = new XRHandPinch()
	}

	// ------------------------------------

	// --------- UPDATING XRTOUCH ---------

	function updateXRTouch() {
		//console.time("TODO --> fast enough? --> GET LEFT / RIGHT HAND")
		const leftHand: Group = getHandSpaceLeft()
		const rightHand: Group = getHandSpaceRight()
		//console.timeEnd("TODO --> fast enough? --> GET LEFT / RIGHT HAND")

		if (enableTouch.mode) {
			let xrHandTouch: XRHandTouchRayExt | XRHandTouchSphereExt

			switch (enableTouch.mode) {
				case XRHandTouchDefaults.TOUCH_TEST_MODE_RAY:
					xrHandTouchRay === undefined ? createXRHandTouchRayInstance() : null
					xrHandTouch = xrHandTouchRay
					break
				case XRHandTouchDefaults.TOUCH_TEST_MODE_SPHERE:
					xrHandTouchSphere === undefined ? createXRHandTouchSphereInstance() : null
					xrHandTouch = xrHandTouchSphere
					break
				default:
					xrHandTouchRay === undefined ? createXRHandTouchRayInstance() : null
					xrHandTouch = xrHandTouchRay
					break
			}

			const updateArgs: XrTouchUpdateArgs = [
				currentScene,
				$svelthreeStores[sti].raycaster,
				//handProfile,
				leftHand,
				rightHand,
				xrHandTouch,
				$svelthreeStores[sti].xr.currentFrame.delta,
				$svelthreeStores[sti].useBVH,
				enableTouch.debug
			]

			XRHandUtils.TOUCH.updateXRHandTouch(...updateArgs)
		}
	}

	function createXRHandTouchRayInstance() {
		xrHandTouchRay = new XRHandTouchRayExt(enableTouch.lerpFactor, enableTouch.touchDistance)
	}

	function createXRHandTouchSphereInstance() {
		xrHandTouchSphere = new XRHandTouchSphereExt(
			enableTouch.lerpFactor,
			enableTouch.touchDistance,
			enableTouch.sphereRadius
		)
	}

	// ----------------------------------------------------------------------------

	// -------------- ENTRY POINT for adding input to the VR Scene ----------------

	let rendererAvailable = false
	$: if ($svelthreeStores[sti].renderer) {
		rendererAvailable = true
	}

	let currentSceneIndex = undefined
	$: if ($svelthreeStores[sti].currentSceneIndex) {
		currentSceneIndex = $svelthreeStores[sti].currentSceneIndex
	}

	let currentScene: Scene
	$: currentSceneIndex ? updateCurrentScene() : null

	function updateCurrentScene(): void {
		currentScene = $svelthreeStores[sti].scenes[$svelthreeStores[sti].currentSceneIndex - 1].scene
	}

	// TODO  Reactive management of switching input type ('input')
	// this statement will be executed only once the renderer is available and the 'currentSceneIndex' is set
	$: if (rendererAvailable && currentSceneIndex) {
		console.warn("SVELTHREE > SessionVR > currentSceneIndex: ", currentSceneIndex)

		coords ? addGlobalCoords() : null
		createBareboneControllers()
		addControllers()
	}

	// TODO  refactor SvelthreeHelpersXR / additional helpers
	function addGlobalCoords() {
		let currentScene = $svelthreeStores[sti].scenes[$svelthreeStores[sti].currentSceneIndex - 1].scene

		let globalCoord = xrHelpers.getCoordsHelper()
		globalCoord.scale.set(5, 5, 5)
		currentScene.add(globalCoord)
	}

	// --------------------------------------------------------------

	// -------------- CREATE / ADD CONTROLLER MODELS ----------------

	let currentSession: XRSession = null
	$: splashVR && splashVR.currentSession ? (currentSession = splashVR.currentSession) : null

	$: if (currentSession) {
		console.warn("SVELTHREE > SessionVR > currentSession: ", currentSession)
	}

	/*
      IMPORTANT  THIS RUNS THROUGH THE WEBXR MANAGER!
      IMPORTANT  an 'XRInputSourceChangeEvent' is being dispatched TWICE at input change via
     for example Oculus Quest (grippable to hands and vice versa):
     FIRST dispatch:
     - at init / only one dispatch (no 'added inputs'): adds inputs to 'added'
     - subsequent (runs again): 'added' inputs are being moved to 'removed' / 'added' is empty, 'removed' containes removed input sources --> SECOND
     SECOND: adds inputs to 'added'
    */
	/*
    function onInputSourceChange(e: XRInputSourceChangeEvent) {
        const session: XRSession = e.session
        const removed: XRInputSource[] = e.removed
        const added: XRInputSource[] = e.added

        //debugger
    }
    */

	/*
     --strictFunctionTypes:true version
     // Using an Object that implements the EventListenerObject interface, no type assertion required
     @see https://github.com/microsoft/TypeScript/issues/28357#issuecomment-711131035
    */
	const onInputSourceChange: EventListenerObject = {
		handleEvent(e: XRInputSourceChangeEvent) {
			const session: XRSession = e.session
			const removed: XRInputSource[] = e.removed
			const added: XRInputSource[] = e.added

			//debugger
		}
	}

	/*
     Gets available controller instances (three.js),
     It then pushes those controllers to the store --> '$svelthreeStores[sti].xr.controllers'
    */
	/*
     Creates "barebone" WebXRControllers and stores them into '$svelthreeStores[sti].xr.controllers'
     Referencable thorugh:
     $svelthreeStores[sti].xr.controllers
     $svelthreeStores[sti].renderer.xr.getControllers
      IMPORTANT  This just creates barebone controllers at init, we don't know the 'handedness' yet
     The 'handedness' is infered after the controller connects and is saved inside 'xrInputSource' property
    */
	function createBareboneControllers() {
		console.warn("SVELTHREE > SessionVR > createBareboneControllers!")

		$svelthreeStores[sti].xr.controllers = XRControllerUtils.createControllers(
			maxControllers,
			$svelthreeStores[sti].renderer.xr
		)
		console.warn(
			"SVELTHREE > SessionVR > getControllers! $svelthreeStores[sti].xr.controllers: ",
			$svelthreeStores[sti].xr.controllers
		)
	}

	function addControllers() {
		console.warn("SVELTHREE > SessionVR > addControllers!")
		let currentScene = $svelthreeStores[sti].scenes[$svelthreeStores[sti].currentSceneIndex - 1].scene

		console.warn("SVELTHREE > SessionVR > addControllers! currentScene:", currentScene)

		for (let i = 0; i < maxControllers; i++) {
			createAllControllerSpaces(i)
		}
	}

	function createAllControllerSpaces(i: number) {
		console.warn("SVELTHREE > SessionVR > createAllControllerSpaces!")

		// Getting controller TARGET RAY space (:Group)
		const targetRaySpace: Group = $svelthreeStores[sti].renderer.xr.getController(i)
		targetRaySpace.userData.controllerIndex = i

		// Adding controller GRIP space (:Group) to the Scene
		const gripSpace: Group = $svelthreeStores[sti].renderer.xr.getControllerGrip(i)
		gripSpace.userData.controllerIndex = i

		// Adding controller HAND space (:Group) to the Scene
		const handSpace: Group = $svelthreeStores[sti].renderer.xr.getHand(i)
		handSpace.userData.controllerIndex = i

		targetRaySpace.addEventListener("connected", onTargetRaySpaceConnected)
		gripSpace.addEventListener("connected", onGripSpaceConnected)
		handSpace.addEventListener("connected", onHandSpaceConnected)

		targetRaySpace.addEventListener("disconnected", onTargetRaySpaceDisconnected)
		gripSpace.addEventListener("disconnected", onGripSpaceDisconnected)
		handSpace.addEventListener("disconnected", onHandSpaceDisconnected)
	}

	function setCurrentVRInputTypeTo(type: XrSessionVRInputType) {
		currentVRInputType = type
	}

	/*
     Check 'inputConfig' for targetRay configuration and apply it,
     also add grippable interaction (only to targetRaySpace, not gripSpace)
     @see inputConfig
     // TODO  check type of event, TS says:
    */

	function onTargetRaySpaceConnected(e: XrControllerSpaceEvent) {
		const xrInputSource = e.data
		const targetRaySpace: Group = e.target

		if (xrInputSource.hand) {
			XRControllerUtils.tryRemovingSpaceFromScene(targetRaySpace, currentScene)
			return
		}

		//console.log("onTargetRaySpaceConnected --> e: ", e)

		const handedness: XRHandedness = e.data.handedness

		targetRaySpace.userData.xrInputSource = xrInputSource
		targetRaySpace.userData.spaceType = "targetray"

		let grippableConfig: XrInputConfigGrippable

		inputConfig ? (grippableConfig = XRControllerUtils.getInputConfigGrippable(inputConfig)) : null

		if (grippableConfig) {
			XRControllerUtils.applyTargetRayConfig(grippableConfig, handedness, targetRaySpace, true)
			setCurrentVRInputTypeTo("grippable")
			addTargetRaySpaceListeners(targetRaySpace)
		}

		XRControllerUtils.tryAddingSpaceToScene(targetRaySpace, currentScene)

		debugger
	}

	function onTargetRaySpaceDisconnected(e: XrControllerSpaceEvent) {
		const targetRaySpace: Group = e.target
		removeTargetRaySpaceListeners(targetRaySpace)
		XRControllerUtils.clearControllerSpace(targetRaySpace)
	}

	function addTargetRaySpaceListeners(targetRaySpace: Group) {
		XRControllerUtils.addListeners(targetRaySpace, dispatchControllerEvent)
	}

	function removeTargetRaySpaceListeners(targetRaySpace: Group) {
		XRControllerUtils.removeListeners(targetRaySpace, dispatchControllerEvent)
	}

	function onGripSpaceConnected(e: XrControllerSpaceEvent) {
		const xrInputSource = e.data
		const gripSpace: Group = e.target

		if (xrInputSource.hand) {
			XRControllerUtils.tryRemovingSpaceFromScene(gripSpace, currentScene)
			return
		}

		//console.log("onGripSpaceConnected --> e: ", e)

		// TODO  recreate gripModel if config changed

		gripSpace.userData.xrInputSource = xrInputSource
		gripSpace.userData.spaceType = "grip"

		const handedness: XRHandedness = xrInputSource.handedness

		let inputConfigGrippable: XrInputConfigGrippable

		inputConfig ? (inputConfigGrippable = XRControllerUtils.getInputConfigGrippable(inputConfig)) : null

		if (inputConfigGrippable) {
			//let gripConfig: XrControllerSpaceModelConfig

			// TODO  verify grippableConfig: only 1x "both" || max 1x of each "left" or "right"

			const useGrip: boolean = XRControllerUtils.applyGrippableConfig(inputConfigGrippable, gripSpace, handedness)

			if (useGrip) {
				const addGripModel: boolean = XRControllerUtils.addGripModelCheck(gripSpace)

				if (addGripModel) {
					// TODO  We could pass a custom GLTF-Loader to the XRControllerModelFactory, but it doesn't seem to be implemented fully in 119 (?)

					const gripModel: XRControllerModel = XRControllerUtils.addNewXRControllerModelToSpace(gripSpace)

					if (gripModel) {
						// TODO  We could do something with the gripModel here, for example we can add some visual helpers or change the model appearance
					}

					// Load the gripModel
					gripSpace.removeEventListener("connected", onGripSpaceConnected)
					gripSpace.dispatchEvent({ type: "connected", data: xrInputSource })
					gripSpace.addEventListener("connected", onGripSpaceConnected)
				} else {
					// If we've provided a custom grip configuration (not implemented yet) we want to delete the standard one
					if (gripSpace.userData.gripConfig) {
						XRControllerUtils.removeAllExistingXRControllerModelsFromSpace(gripSpace)
					}

					// TODO  We could do something here with the provided custom grip configuration (not implemented yet)
				}

				setCurrentVRInputTypeTo("grippable")
				// RECONSIDER  We're currently not adding interaction Listeners to gripSpace
			} else {
				XRControllerUtils.removeAllExistingXRControllerModelsFromSpace(gripSpace)
				XRControllerUtils.clearControllerSpace(gripSpace)
			}
		}

		XRControllerUtils.tryAddingSpaceToScene(gripSpace, currentScene)
	}

	function onGripSpaceDisconnected(e: XrControllerSpaceEvent) {
		// RECONSIDER  Interaction listeners are being added to target ray space only
		// IMPORTANT  if using three built in controller models, these manage themselves on 'connected' ad 'disconnected'
		// RECONSIDER  Do we want to remove the space?! no, actually not
		// currentScene.remove(e.target)
	}

	function onHandSpaceConnected(e: XrControllerSpaceEvent) {
		const xrInputSource = e.data
		const handSpace: Group = e.target

		if (!xrInputSource.hand) {
			XRControllerUtils.tryRemovingSpaceFromScene(handSpace, currentScene)
			return
		}

		//console.log("onHandSpaceConnected --> e: ", e)

		const handedness: XRHandedness = e.data.handedness

		handSpace.userData.xrInputSource = e.data
		handSpace.userData.spaceType = "hand"

		let inputConfigHand: XrInputConfigHand

		inputConfig ? (inputConfigHand = XRHandUtils.getInputConfigHand(inputConfig)) : null

		// TODO  Implement options (_low)
		if (inputConfigHand) {
			const useHand: boolean = XRHandUtils.applyHandConfig(inputConfigHand, handedness, handSpace)

			if (useHand) {
				const addXRHandModel: boolean = XRHandUtils.addXRHandModelCheck(handSpace)

				if (addXRHandModel) {
					const handModel = XRHandUtils.addNewXRHandModelToSpace(handSpace)

					// TOFIX  Hand helpers are a mess, something changed, find out what and fix it.
					handHelpers ? xrHelpers.addHandHelpers(handModel, handedness) : null

					// Load the handModel
					handSpace.removeEventListener("connected", onHandSpaceConnected)
					handSpace.dispatchEvent({ type: "connected", data: xrInputSource })
					handSpace.addEventListener("connected", onHandSpaceConnected)
				}

				setCurrentVRInputTypeTo("hand")
				addHandInteraction(handSpace)
			} else {
				XRHandUtils.removeAllExistingXRHandModelsFromSpace(handSpace)
				XRControllerUtils.clearControllerSpace(handSpace)
			}
		}

		XRControllerUtils.tryAddingSpaceToScene(handSpace, currentScene)
	}

	function onHandSpaceDisconnected(e: XrControllerSpaceEvent) {
		// remove listener from disconnected space
		const handSpace: Group = e.target
		removeHandSpaceListeners(handSpace)

		//  TODO  remove debugger stuff

		// [!] if using standard hand model, these manage itself

		// RECONSIDER  Do we want to remove the space?! no, actually not
		// currentScene.remove(e.target)
	}

	function removeHandSpaceListeners(handSpace: Group) {
		XRHandUtils.PINCH.removeListeners(handSpace, dispatchHandPinchEvent)
		XRHandUtils.TOUCH.removeListeners(handSpace, dispatchHandTouchEvent)

		XRHandUtils.TOUCH.unregisterEvents(handSpace)
		XRHandUtils.TOUCHX.unregisterEventsX(handSpace)

		doUpdatePinchRays = false
		doUpdateXRTouch = false
	}

	// CONTROLLER SPACE GETTERS

	export function getControllerTargetRayLeft(): Group {
		const manager: WebXRManager = $svelthreeStores[sti].renderer.xr
		const handedness: XRHandedness = "left"
		return XRControllerUtils.getTargetRaySpaceByHandedness(manager, handedness)
	}

	export function getControllerGripLeft() {
		const manager: WebXRManager = $svelthreeStores[sti].renderer.xr
		const handedness: XRHandedness = "left"
		return XRControllerUtils.getGripSpaceByHandedness(manager, handedness)
	}

	export function getControllerTargetRayRight(): Group {
		const manager: WebXRManager = $svelthreeStores[sti].renderer.xr
		const handedness: XRHandedness = "right"
		return XRControllerUtils.getTargetRaySpaceByHandedness(manager, handedness)
	}

	export function getControllerGripRight() {
		const manager: WebXRManager = $svelthreeStores[sti].renderer.xr
		const handedness: XRHandedness = "right"
		return XRControllerUtils.getGripSpaceByHandedness(manager, handedness)
	}

	export function getHandSpaceLeft(): Group {
		const manager: WebXRManager = $svelthreeStores[sti].renderer.xr
		const handedness: XRHandedness = "left"
		return XRHandUtils.getHandSpaceByHandedness(manager, handedness)
	}

	export function getHandSpaceRight(): Group {
		const manager: WebXRManager = $svelthreeStores[sti].renderer.xr
		const handedness: XRHandedness = "right"
		return XRHandUtils.getHandSpaceByHandedness(manager, handedness)
	}

	// ---------------------------------------------------------

	// -------------- CREATE / ADD START SCREEN ----------------

	//let currentSession: XRSession
	//let button: HTMLButtonElement
	let vrButtonAdded: boolean = false

	$: if ($svelthreeStores[sti].canvas.dom && !vrButtonAdded && domOverlay) {
		console.warn(domOverlay)
		createSplash()
	}

	// TODO  consider moving this out of the component (class)

	let splashVR: SplashVR

	function createSplash(): void {
		splashVR = new SplashVR(requiredFeatures, optionalFeatures, domOverlay, btnClass, sessionMode, btnTxt)
		splashVR.dispatcher.addEventListener("ready", onSplashReady)
		splashVR.initialize()

		$svelthreeStores[sti].xr.sessionMode = sessionMode
		vrButtonAdded = true
	}

	function onSplashReady(e: { type: string; [attachment: string]: any }): void {
		// Triggers on:ready={fooReady} which sets 'bar' to 'true' and mounts / renders the VR Scene : for example {#if bar}
		dispatch("ready", { session: e.session })
		tryOnSessionStarted(e.session)
	}

	function tryOnSessionStarted(session: XRSession): void {
		if ($svelthreeStores[sti].renderer) {
			onSessionStarted(session)
		} else {
			setTimeout(() => {
				tryOnSessionStarted(session)
			}, 100)
		}
	}

	function onSessionStarted(session: XRSession) {
		/*
         concerning session.domOverlayState:
         session.domOverlayState.type is now set if supported,
         or is null if the feature is not supported.
        */

		splashVR.onSessionStarted(session)
		session.addEventListener("inputsourceschange", onInputSourceChange)
		session.addEventListener("end", onSessionEnded)
		$svelthreeStores[sti].renderer.xr.setSession(session)

		// Triggers on:ended={fooStarted}
		dispatch("started", { session: session })
	}

	const onSessionEnded: EventListenerObject = {
		handleEvent(e: XRSessionEvent) {
			e.session.removeEventListener("end", onSessionEnded)

			// update splash
			splashVR.onSessionEnded()

			// remove hand interactivity and reset store
			removeHandsInteractivity()
			resetStore()

			//currentSession = null
			currentSceneIndex = undefined

			// Triggers on:ended={fooEnded} which sets 'bar' to 'false' unmounts the VR Scene : for example {#if bar}
			dispatch("ended")
		}
	}

	/*
    function onSessionEnded(e: XRSessionEvent): void {

        e.session.removeEventListener("end", onSessionEnded)

        // update splash
        splashVR.onSessionEnded()

        // remove hand interactivity and reset store
        removeHandsInteractivity()
        resetStore()

        //currentSession = null
        currentSceneIndex = undefined

        // Triggers on:ended={fooEnded} which sets 'bar' to 'false' unmounts the VR Scene : for example {#if bar}
        dispatch("ended")
    }
    */

	function resetStore() {
		$svelthreeStores[sti].renderer.xr.setSession(null)
		$svelthreeStores[sti].allIntersections = undefined

		$svelthreeStores[sti].renderer = undefined
		// $svelthreeStores[sti].raycaster = undefined // reuse initally created raycaster (Canvas)

		$svelthreeStores[sti].scenes = []
		$svelthreeStores[sti].currentSceneIndex = undefined
		$svelthreeStores[sti].cameras = []
		$svelthreeStores[sti].activeCamera = undefined

		$svelthreeStores[sti].xr.controller = undefined
		$svelthreeStores[sti].xr.hitTestSource = null
		$svelthreeStores[sti].xr.hitTestSourceRequested = false
		$svelthreeStores[sti].xr.hitTestResults = undefined
		$svelthreeStores[sti].xr.reticle = undefined
	}

	// ----------------------------------------

	// -------------- ON MOUNT ----------------

	onMount(() => {
		console.info("SVELTHREE > onMount : SessionVR")
	})
</script>

<slot />
