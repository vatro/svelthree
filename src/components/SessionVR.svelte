<script lang="typescript">
    /**
     * @author Vatroslav Vrbanic @see https://github.com/vatro
     */

    /**
     * This started as an adaption of the SessionAR component
     * @see https://github.com/mrdoob/three.js/blob/master/examples/jsm/webxr/VRButton.js
     * @see https://github.com/mrdoob/three.js/blob/master/examples/webxr_vr_dragging.html (2 controllers)
     */

    import { onMount } from "svelte"
    import { svelthreeStores } from "../stores.js"
    import { createEventDispatcher } from "svelte"
    import { get_current_component } from "svelte/internal"
    import { SvelthreeHelpersXR } from "../utils/SvelthreeHelpersXR"
    import XRHandPinch from "../utils/XRHandPinch"
    import XRHandTouchRayExt from "../utils/XRHandTouchRayExt"
    import XRHandTouchSphereExt from "../utils/XRHandTouchSphereExt"
    import XRControllerUtils from "../utils/XRControllerUtils"
    import {
        Group,
        XRControllerModelFactory,
        XRHandModelFactory,
        XRHandModel,
        XRControllerModel,
        Scene,
        WebXRManager,
        WebXRController
    } from "svelthree-three"

    import XRHandTouchDefaults from "../defaults/XRHandTouchDefaults"
    import XRControllerDefaults from "../defaults/XRControllerDefaults"
    import XRDefaults from "../defaults/XRDefaults"
    import XRHandUtils from "../utils/XRHandUtils"
    import SplashVR from "../utils/SplashVR"

    const self = get_current_component()
    const dispatch: (type: string, detail?: any) => void = createEventDispatcher()

    export let sti: number

    if (sti === undefined) {
        console.warn("SVELTHREE > SessionVR : You have to provide a {sti} prop for the WebGLRenderer component!", {
            sti: sti
        })
        throw new Error("SVELTHREE Exception (see warning above)")
    }

    const sessionMode: XRSessionMode = XRDefaults.SESSION_MODE_VR
    export let requiredFeatures: XRRequiredFeatures[] = undefined
    const hitTestMode: XRHitTestMode = XRDefaults.DEFAULT_VR_XR_HITTEST_MODE
    export let optionalFeatures: XROptionalFeatures[] = undefined
    export let btnClass: string = undefined
    export let btnTxt: { [key: string]: string } = undefined
    export let domOverlay: HTMLDivElement = undefined
    export let maxControllers: number = XRControllerDefaults.MAX_CONTROLLERS
    //export let input: SessionVRInputType = XRDefaults.DEFAULT_VR_INPUT_TYPE
    export let inputConfig: SessionVRInputConfig = undefined
    export let controllerConfig: XRInputConfigGrippable = undefined
    let pathToHandModels: string = "./models/fbx/"
    //let handProfile: XRHandProfile = undefined

    export let enablePinch: XRHandPinchConfig = undefined
    export let enableTouch: XRHandTouchConfig = undefined
    export let touchEvents: XRHandTouchEvents = undefined
    export let enableTouchX: XRHandTouchXConfig = undefined

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
        //console.warn("SVELTHREE > SessionVR > updateDomOverlay: ", $svelthreeStores[sti].xr.domOverlay)
    }

    /*
    $: input ? storeInputType() : null

    function storeInputType(): void {
        $svelthreeStores[sti].xr.inputType = input
        //console.warn("SVELTHREE > SessionVR > updateInputType: ", $svelthreeStores[sti].xr.inputType)
    }
    */

    $: inputConfig ? storeInputConfig() : null

    function storeInputConfig(): void {
        $svelthreeStores[sti].xr.inputConfig = inputConfig
        //console.warn("SVELTHREE > SessionVR > storeInputConfig: ",  $svelthreeStores[sti].xr.inputConfig)
    }

    /*
    $: handProfile ? storeHandProfile() : null

    function storeHandProfile(): void {
        $svelthreeStores[sti].xr.handProfile = handProfile
        //console.warn("SVELTHREE > SessionVR > updateHandProfile: ", $svelthreeStores[sti].xr.handProfile)
    }
    */

    $: controllerConfig ? storeControllerConfig() : null

    function storeControllerConfig(): void {
        $svelthreeStores[sti].xr.controllerConfig = controllerConfig
    }

    /*
    --------- REACTIVE PINCH Configuration ---------
    */

    $: enablePinch ? storeAndUpdateEnablePinch() : null

    // WHY?  do we store config double and tripple (in the store and in the hands)?
    // ANSWER  Because we're prototyping and are not yet sure where we'll need this "gloabaly"!
    // TODO  reconsider / refactor above
    function storeAndUpdateEnablePinch(): void {
        console.warn("SVELTHREE > SessionVR > updateEnablePinch!")
        $svelthreeStores[sti].xr.enablePinch = enablePinch

        let updated: XRHandEnablePinchResult = XRHandUtils.applyEnablePinch($svelthreeStores[sti].xr.enablePinch)

        // update store values
        for (const [key, value] of Object.entries(updated)) {
            $svelthreeStores[sti].xr[key] = value
        }

        // TOFIX  it's better to get the hands based on 'xrInputsource.handedness' every time we need them, as we cannot rely they reamin the same
        leftHand ? setPinchInteractivity(leftHand) : null
        rightHand ? setPinchInteractivity(rightHand) : null
    }

    /*
    --------- REACTIVE TOUCH Configuration ---------
    */

    $: enableTouch ? sotreAndUpdateEnableTouch() : null

    // WHY?  do we store config double and tripple (in the store and in the hands)?
    // ANSWER  Because we're prototyping and are not yet sure where we'll need this "gloabaly"!
    // TODO  reconsider / refactor above
    function sotreAndUpdateEnableTouch(): void {
        console.warn("SVELTHREE > SessionVR > updateEnableTouch!")
        $svelthreeStores[sti].xr.enableTouch = enableTouch

        let updated: XRHandEnableTouchResult

        if ($svelthreeStores[sti].xr.enableTouch.hands) {
            updated = XRHandUtils.applyEnableTouch($svelthreeStores[sti].xr.enableTouch.hands)
        } else {
            let hands: XRHandTouchConfigHands = XRHandTouchDefaults.ENABLETOUCH_HANDS_DEFAULT
            updated = XRHandUtils.applyEnableTouch(hands)
        }

        // update store values
        for (const [key, value] of Object.entries(updated)) {
            $svelthreeStores[sti].xr[key] = value
        }

        // TOFIX  it's better to get the hands based on 'xrInputsource.handedness' every time we need them, as we cannot rely they reamin the same
        leftHand ? setTouchInteractivity(leftHand) : null
        rightHand ? setTouchInteractivity(rightHand) : null
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

        //renderer is not available on init, so this will not be executed twice, only on reactive update!
        if (rendererAvailable) {
            applyHandTouchEventsX()
        }
    }

    /**
     * CONTROLLER EVENTS: Universal Event dispatcher for controller of input type "controller"
     *
     * Dispatches CONTROLLER Events from SessionVR's components scope.
     * IMPORTANT  In contrast to events being dispatched by interactive intersected Objects, the 'XRControllerEventSession' dispatcher
     * will ALWAYS dispatch the event even if the controller target ray doesn't intersect an object.
     * @see XRControllerUtils.getRayIntersections is being executed just before dispatching an Event:
     */

    const dispatchControllerEventFromSession = createEventDispatcher<XRControllerEventSessionDispatcher>()

    function dispatchControllerEvent(e) {
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

            let eventType: XRControllerEventType | XRControllerEventTypeMissed = e.type

            if (intersections === []) {
                eventType === "select" ? (eventType = "missed_all_select") : null
                eventType === "squeeze" ? (eventType = "missed_all_squeeze") : null
            } else if (targetObj !== null && targetObj.userData.interact === false) {
                eventType === "select" ? (eventType = "missed_interactive_select") : null
                eventType === "squeeze" ? (eventType = "missed_interactive_squeeze") : null
            }

            const eventDetail: XRControllerEventDetailSession = {
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

    let leftHand: Group
    let rightHand: Group

    function addHandInteraction(e: XRControllerSpaceEvent) {
        // let hand0 = $svelthreeStores[sti].renderer.xr.getHand(0) // Group
        // console.log(hand0)
        // debugger

        //if ( e.data.hand && ! (e.target as XRHandModel).motionController ) {
        if (e.data.hand) {
            //let handModel: XRHandModel = e.target.children[25] as XRHandModel
            let handGroup: Group = e.target

            console.log("-------- addHandInteraction -----------")
            //console.log("handModel: ", handModel)
            console.log("handGroup: ", handGroup)

            prepareHandForInteraction(handGroup)

            enablePinch !== undefined ? setPinchInteractivity(e.target) : null
            enableTouch !== undefined ? setTouchInteractivity(e.target) : null

            if (touchEvents !== undefined) {
                applyHandTouchEvents()
            }

            if (enableTouchX !== undefined) {
                applyHandTouchEventsX()
            }
        }
    }

    // WHY?  do we store config double and tripple (in the store and in the hands)?
    // ANSWER  Because we're prototyping and are not yet sure where we'll need this "gloabaly"!
    // TODO  reconsider / refactor above
    function prepareHandForInteraction(handSpace: Group) {
        console.log("------ prepareHandForInteraction! ----------")
        XRHandUtils.addName(handSpace)
        console.log("After addName: ", handSpace)
        XRHandUtils.addUserDataHandedness(handSpace)
        console.log("After addUserDataHandedness: ", handSpace)

        let handInputSource: XRInputSource = handSpace.userData.xrInputSource

        console.log("handInputSource (handModel.userData.xrInputSource): ", handInputSource)

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

        assignHandToGlobalInstance(handSpace)
    }

    function assignHandToGlobalInstance(handSpace: Group) {
        let handInputSource: XRInputSource = handSpace.userData.xrInputSource

        handInputSource.handedness === XRControllerDefaults.HANDEDNESS_LEFT ? (leftHand = handSpace) : null
        handInputSource.handedness === XRControllerDefaults.HANDEDNESS_RIGHT ? (rightHand = handSpace) : null
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
        XRHandUtils.TOUCH.applyEvents(leftHand, rightHand, $svelthreeStores[sti].xr.touchEvents, dispatchHandTouchEvent)
    }

    // TOUCHX INTERACTIVITY

    function applyHandTouchEventsX() {
        XRHandUtils.TOUCHX.applyEventsX(
            leftHand,
            rightHand,
            $svelthreeStores[sti].xr.enableTouchX,
            dispatchHandTouchEventX
        )
    }

    /**
     * CLEAN UP SessionVR scoped HAND Listeners
     * @see showEnterVR.onSessionEnded
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
    }

    /*
    --------- SessionVR SCOPED EVENTS ---------
    */

    /**
     * Dispatches PINCH Events from SessionVR's components scope
     * WHY?  This way we can listen to pinch events "globaly", not just if a pichable object was piched
     */
    function dispatchHandPinchEvent(e) {
        console.warn("SVELTHREE > SessionVR > dispatchHandPinchEvent : (global) PINCH EVENT! --> ", e.type)

        // TODO  EVENTS: check event TYPE and detail / refine
        dispatch(e.type, { handedness: e.handedness, target: e.target })
    }

    /**
     * Dispatches TOUCH Events from SessionVR's components scope
     * WHY?  This way we can define "global" pinch events, not just if a pichable object was piched
     */
    function dispatchHandTouchEvent(e) {
        console.warn("SVELTHREE > SessionVR > dispatchHandTouchEvent : (global) TOUCH EVENT! --> ", e.type)

        // TODO  EVENTS: check event TYPE and detail / refine
        dispatch(e.type, { handedness: e.handedness, target: e.target })
    }

    /**
     * Dispatches TOUCHX Events from SessionVR's components scope
     * WHY?  This way we can listen to pinch events "globaly", not just if a pichable object was piched
     */
    function dispatchHandTouchEventX(e) {
        console.warn("SVELTHREE > SessionVR > dispatchHandTouchEventX : (global) TOUCHX EVENT! --> ", e.type)

        // TODO  EVENTS: check event TYPE and detail / refine
        dispatch(e.type, { handedness: e.handedness, target: e.target })
    }

    /*
    -------------------------------------------
    */

    /*
    --------- XRFrame Update ---------
    */

    let xrHandPinch: XRHandPinch
    let xrHandTouchRay: XRHandTouchRayExt
    let xrHandTouchSphere: XRHandTouchSphereExt

    let doUpdatePinchRays = false
    let doUpdateXRTouch = false

    $: $svelthreeStores[sti].xr.currentFrame.frame ? onXRFrame() : null

    function onXRFrame() {
        doUpdatePinchRays ? updatePinchRays() : null
        doUpdateXRTouch ? updateXRTouch() : null
    }

    /*
    ----------------------------------
    */

    /*
    --------- UPDATING PINCH ---------
    */

    function updatePinchRays(): void {
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

    /*
    ------------------------------------
    */

    /*
    --------- UPDATING XRTOUCH ---------
    */

    function updateXRTouch() {
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

            const updateArgs: XRTouchUpdateArgs = [
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

    /*
    -------------------------------------------
    */

    /*
    -------------- ENTRY POINT for adding input to the VR Scene ---------------- 
    */

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
    /**
     * This statement will be executed only once the renderer is available and the 'currentSceneIndex' is set
     */
    $: if (rendererAvailable && currentSceneIndex) {
        console.warn("SVELTHREE > SessionVR > currentSceneIndex: ", currentSceneIndex)

        coords ? addGlobalCoords() : null
        createBareboneControllers()
        addControllers()
    }

    /*
    -------------------------------------------
    */

    // TODO  Refactor SvelthreeHelpersXR / additional helpers
    function addGlobalCoords() {
        let currentScene = $svelthreeStores[sti].scenes[$svelthreeStores[sti].currentSceneIndex - 1].scene

        let globalCoord = xrHelpers.getCoordsHelper()
        globalCoord.scale.set(5, 5, 5)
        currentScene.add(globalCoord)
    }

    /*
    --------------------------------------------------------------
    */

    /*
    -------------- CREATE / ADD CONTROLLER MODELS ---------------- 
    */

    /**
     * Gets available controller instances (three.js),
     * It then pushes those controllers to the store --> '$svelthreeStores[sti].xr.controllers'
     */
    /**
     * Creates "barebone" WebXRControllers and stores them into '$svelthreeStores[sti].xr.controllers'
     * Referencable thorugh:
     * $svelthreeStores[sti].xr.controllers
     * $svelthreeStores[sti].renderer.xr.getControllers
     * IMPORTANT  This just creates barebone controllers at init, we don't know the 'handedness' yet
     * The 'handedness' is infered after the controller connects and is saved inside 'xrInputSource' property
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

        //check
        /*
        let controllerXRM_0 = $svelthreeStores[sti].renderer.xr.getControllers[0]
        let controllerXRM_1 = $svelthreeStores[sti].renderer.xr.getControllers[1]
        let controllerStore_0 = $svelthreeStores[sti].xr.controllers[0]
        let controllerStore_1 = $svelthreeStores[sti].xr.controllers[1]

        console.log(controllerXRM_0 === controllerStore_0) // true
        console.log(controllerXRM_1 === controllerStore_1) // true

        debugger
        */
    }

    let controllerModelFactory: XRControllerModelFactory = new XRControllerModelFactory()
    let handModelFactory: XRHandModelFactory = new XRHandModelFactory().setPath(pathToHandModels)

    function addControllers() {
        console.warn("SVELTHREE > SessionVR > addControllers!")
        let currentScene = $svelthreeStores[sti].scenes[$svelthreeStores[sti].currentSceneIndex - 1].scene

        console.warn("SVELTHREE > SessionVR > addControllers! currentScene:", currentScene)

        for (let i = 0; i < maxControllers; i++) {
            //for (let i = 0; i < $svelthreeStores[sti].renderer.xr.getControllers().length; i++) {
            //if ($svelthreeStores[sti].renderer.xr.getControllers()[i].parent !== currentScene) {

            /*
                switch (input) {
                    case XRDefaults.VR_INPUT_TYPE_CONTROLLER:
                        addController(i, currentScene)
                        break
                    case XRDefaults.VR_INPUT_TYPE_HAND:
                        addHand(i, currentScene)
                        break
                    case XRDefaults.VR_INPUT_TYPE_HYBRID:
                        addController(i, currentScene)
                        addHand(i, currentScene)
                        break
                    default:
                        // input has default value
                        break
                }
                */

            addGrippable(i, currentScene)
            addHand(i, currentScene)

            //}
        }
    }

    /**
     * Reactive HAND detection
     */

    /**
     * TODO  Back to the roots: test controllers more / extend visualizations!
     */
    function addGrippable(i: number, currentScene: Scene) {
        /**
         * Getting controller TARGET RAY space (:Group)
         * @see storeControllers
         * @see (svelthree-three).WebXRManager.getController
         * @see (svelthree-three).WebXRController.getTargetRaySpace
         */
        const targetRaySpace: Group = $svelthreeStores[sti].renderer.xr.getController(i)
        targetRaySpace.userData.controllerIndex = i

        // targetRaySpace welche uuid?
        //debugger

        /**
         * Adding a 'controllerRay' (:Line) to controller TARGET RAY space
         */
        // add standard ray first, config (if provided) will be applied on connect
        // XRControllerUtils.addRayToControllerTargetRaySpace(targetRaySpace)

        //debugger

        /**
         * Adding controller GRIP space (:Group) to the Scene
         * These are currently NOT being being stored
         * @see (svelthree-three).WebXRManager.getControllerGrip
         * @see (svelthree-three).WebXRController.getGripSpace
         */
        // const gripSpace: Group = $svelthreeStores[sti].renderer.xr.getControllerGrip(i)
        // gripSpace.userData.controllerIndex = i

        /**
         * Creating and adding a controller GRIP MODEL to controller GRIP SPACE
         */
        // gripSpace.add(controllerModelFactory.createControllerModel(gripSpace))
        // const gripSpaceModel: XRControllerModel = controllerModelFactory.createControllerModel(gripSpace)

        // gripSpace.add(gripSpaceModel)

        // gripSpace welche uuid?
        //debugger

        /**
         * Adding controller GRIP SPACE (:Group) incl. the previously added GRIP MODEL to Scene
         */

        currentScene.add(targetRaySpace)
        console.warn("SVELTHREE > SessionVR > addController! targetRaySpace:", targetRaySpace)

        /*
        currentScene.add(gripSpace)
        console.warn("SVELTHREE > SessionVR > addController! grip:", gripSpace)
        */

        // connected / disconnected Listeners
        /**
         *  IMPORTANT
         * WebXRController dispatches events through available / created "spaces" (Groups)
         * @see WebXRController.dispatchEvent
         * "connected" and "disconnected" Events are being dispatched on "inputsourceschange" Event
         * @see WebXRManager : `session.addEventListener( 'inputsourceschange', updateInputSources )`
         * @see WebXRManager.updateInputSources :
         * `controller.dispatchEvent( { type: 'disconnected', data: inputSource } )`
         * `controller.dispatchEvent( { type: 'connected', data: inputSource } )`
         *
         * Conclusions:
         *
         * CONTROLLER:
         * The controller has two spaces "targetRay" and "grip". If we add listeners to both, the same
         * events will be dispatched by both spaces (Groups). This may be usefull if we want handle events
         * differently on these two. E.g. we could change the appearance of the ray and the grip Groups (e.target)
         * based on controller events. So it makes sense to add all events to both of them and and dispatch them via
         * @see SvelthreeInteractionVRController
         *
         * HAND:
         * ...
         */

        // debugger

        targetRaySpace.addEventListener("connected", onConnectedControllerTargetRaySpace)
        //gripSpace.addEventListener("connected", onConnectedControllerGripSpace)
        targetRaySpace.addEventListener("disconnected", onDisconnectedControllerTargetRaySpace)
        //gripSpace.addEventListener("disconnected", onDisconnectedControllerGripSpace)
    }

    // {type: "connected", data: XRInputSource, target: Group}
    function onConnectedControllerTargetRaySpace(e: XRControllerSpaceEvent) {
        console.log("onConnectedControllerTargetRaySpace --> e: ", e)
        e.target.userData.xrInputSource = e.data
        e.target.userData.spaceType = "targetray"

        let handedness: XRHandedness = e.data.handedness
        let targetRaySpace: Group = e.target

        let grippableConfig: XRInputConfigGrippable

        inputConfig ? (grippableConfig = XRHandUtils.getInputConfigGrippable(inputConfig)) : null

        const manager: WebXRManager = $svelthreeStores[sti].renderer.xr

        console.log("grippableConfig: ", grippableConfig)

        if (grippableConfig) {
            if (XRControllerUtils.applyGrippableConfig(grippableConfig, handedness, targetRaySpace, true)) {
                let index: number = targetRaySpace.userData.controllerIndex
                let xrInputSource: XRInputSource = e.data

                const gripSpace: Group = $svelthreeStores[sti].renderer.xr.getControllerGrip(index)
                gripSpace.userData.controllerIndex = index

                debugger

                //const gripSpaceModel: XRControllerModel = controllerModelFactory.createControllerModel(gripSpace, xrInputSource)
                const gripSpaceModel: XRControllerModel = controllerModelFactory.createControllerModel(
                    gripSpace,
                    xrInputSource
                )

                gripSpace.add(gripSpaceModel)
                currentScene.add(gripSpace)

                addTargetRaySpaceListeners(e)
            } else {
                // remove standard ray and don't add interaction if no grip-config was found for this controller
                // XRControllerUtils.clearControllerSpace(targetRaySpace)

                let controller: WebXRController = manager.getControllers()[targetRaySpace.userData.controllerIndex]
                controller.getTargetRaySpace = null
                controller.getGripSpace = null

                console.warn("XXX applyGrippableConfig failed!")
                console.log("controller: ", controller)
                console.log("targetRaySpace: ", targetRaySpace)
                console.log("targetRaySpace.userData.controllerIndex: ", targetRaySpace.userData.controllerIndex)
            }
        } else {
            console.warn("XXX no grippableConfig!")
            console.log("inputConfig: ", inputConfig)
        }
    }

    /*
    function onConnectedControllerGripSpace(e: XRControllerSpaceEvent) {
        console.log("onConnectedControllerGripSpace --> e: ", e)
    }
    */

    function onDisconnectedControllerTargetRaySpace(e: XRControllerSpaceEvent) {
        console.log("onDisconnectedControllerTargetRaySpace --> e: ", e)

        removeTargetRaySpaceListeners(e)

        e.target.userData.xrInputSource = null
        e.target.userData.controllerSpaceType = null
    }

    /*
    function onDisconnectedControllerGripSpace(e: XRControllerSpaceEvent) {
        console.log("onDisconnectedControllerGripSpace --> e: ", e)
    }
    */

    function addTargetRaySpaceListeners(e: XRControllerSpaceEvent) {
        const targetRaySpace: Group = e.target
        targetRaySpace ? XRControllerUtils.addListeners(targetRaySpace, dispatchControllerEvent) : null
    }

    function removeTargetRaySpaceListeners(e: XRControllerSpaceEvent) {
        const targetRaySpace: Group = e.target
        targetRaySpace ? XRControllerUtils.removeListeners(targetRaySpace, dispatchControllerEvent) : null
    }

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

    /*
    -------------------------------------------------------- 
    */

    /*
    -------------- CREATE / ADD HAND MODELS ---------------- 
    */

    /**
     * TODO  Describe what happens here in detail
     * TODO  What happens if we're in hand mode but grab the controllers?! (I think I tested that allready)
     */
    function addHand(i: number, currentScene: Scene) {
        let handSpace: Group = $svelthreeStores[sti].renderer.xr.getHand(i)
        handSpace.userData.controllerIndex = i

        console.warn("SVELTHREE > SessionVR > addHand!:", handSpace)

        handSpace.addEventListener("connected", onConnectedHandSpace)
        handSpace.addEventListener("disconnected", onDisconnectedHandSpace)
    }

    function onConnectedHandSpace(e: XRControllerSpaceEvent) {
        console.log("onConnectedHandSpace --> e: ", e)
        e.target.userData.xrInputSource = e.data
        e.target.userData.spaceType = "hand"

        let handedness: XRHandedness = e.data.handedness
        let handSpace: Group = e.target

        let inputConfigHand: XRInputConfigHand

        inputConfig ? (inputConfigHand = XRHandUtils.getInputConfigHand(inputConfig)) : null

        let handModel: XRHandModel

        const manager: WebXRManager = $svelthreeStores[sti].renderer.xr

        // TODO  Implement options (_low)
        if (inputConfigHand) {
            if (XRHandUtils.applyHandConfig(inputConfigHand, handedness, handSpace)) {
                let xrInputSource: XRInputSource = e.data

                handModelFactory.setPath(handSpace.userData.pathToHandModels)
                handModel = handModelFactory.createHandModel(
                    handSpace,
                    handSpace.userData.handProfile,
                    null,
                    xrInputSource
                )

                // TOFIX  Hand helpers are a mess, something changed, find out what and fix it.
                handHelpers ? xrHelpers.addHandHelpers(handModel, handedness) : null

                handSpace.add(handModel)
                currentScene.add(handSpace)

                addHandInteraction(e)
            } else {
                console.warn("XXX applyHandConfig failed!")
                console.log("inputConfigHand: ", inputConfigHand)
                // don't add handModel and don't add hand-interaction if no hand-config was found for this controller
            }
        } else {
            let controller: WebXRController = manager.getControllers()[handSpace.userData.controllerIndex]
            controller.getHandSpace = null

            console.warn("XXX no inputConfigHand!")
            console.log("inputConfig: ", inputConfig)
        }
    }

    function onDisconnectedHandSpace(e: XRControllerSpaceEvent) {
        console.log("onDisconnectedHandSpace --> e: ", e)
        //removeHandInteraction(e)
    }

    /*
    -------------------------------------------------------- 
    */

    /*
    -------------- CREATE / ADD START SCREEN ----------------
    */

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
        // Triggers on:ready={fooReady} which sets 'bar' to 'true' and mounts / renders the VR Scene : e.g. {#if bar}
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
        /**
         * concerning session.domOverlayState:
         * session.domOverlayState.type is now set if supported,
         * or is null if the feature is not supported.
         */

        splashVR.onSessionStarted(session)
        session.addEventListener("end", onSessionEnded)
        $svelthreeStores[sti].renderer.xr.setSession(session)

        // Triggers on:ended={fooStarted}
        dispatch("started", { session: session })
    }

    function onSessionEnded(evt: XRSessionEvent): void {
        evt.session.removeEventListener("end", onSessionEnded)

        // update splash
        splashVR.onSessionEnded()

        // remove hand interactivity and reset store
        removeHandsInteractivity()
        resetStore()

        //currentSession = null
        currentSceneIndex = undefined

        // Triggers on:ended={fooEnded} which sets 'bar' to 'false' unmounts the VR Scene : e.g. {#if bar}
        dispatch("ended")
    }

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

    /*
    ----------------------------------------
    */

    /*
    -------------- ON MOUNT ----------------
    */

    onMount(() => {
        console.info("SVELTHREE > onMount : SessionVR")
    })
</script>

<slot />
