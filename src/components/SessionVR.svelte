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
    import { SvelthreeHelpersXR } from "../utils/SvelthreeHelpersXR"
    import { XRHandHitTester } from "../utils/XRHandHitTester"
    import { XRHandTouchRayExt } from "../utils/XRHandTouchRayExt"
    import { XRHandTouchSphereExt } from "../utils/XRHandTouchSphereExt"
    import XRControllerUtils from "../utils/XRControllerUtils"
    import {
        Vector3,
        Quaternion,
        Object3D,
        Group,
        Matrix4,
        XRControllerModelFactory,
        XRHandModelFactory,
        XRHandModel,
        BufferGeometry,
        BufferAttribute,
        Scene,
        Line,
        LineBasicMaterial,
        LineDashedMaterial,
        MeshStandardMaterial
    } from "svelthree-three"

    import XRHandTouchDefaults from "../defaults/XRHandTouchDefaults"
    import XRControllerDefaults from "../defaults/XRControllerDefaults"
    import XRDefaults from "../defaults/XRDefaults"
    import XRHandUtils from "../utils/XRHandUtils.js"

    let dispatch: (type: string, detail?: any) => void = createEventDispatcher()

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
    export let input: SessionVRInputType = XRDefaults.DEFAULT_VR_INPUT_TYPE
    export let pathToHandModels: string = "./models/fbx/"
    export let handProfile: XRHandProfile = undefined

    export let enablePinch: XRHandPinchConfig = undefined
    export let enableTouch: XRHandTouchConfig = undefined
    export let touchEvents: XRHandTouchEvents = undefined
    export let enableTouchX: XRHandTouchXConfig = undefined

    let xrHelpers: SvelthreeHelpersXR = new SvelthreeHelpersXR()
    let xrHandHitTester: XRHandHitTester = new XRHandHitTester()

    $: requiredFeatures ? updateRequiredFeatures() : null

    function updateRequiredFeatures(): void {
        $svelthreeStores[sti].xr.requiredFeatures = [...requiredFeatures]
        //console.warn("SVELTHREE > SessionVR > updateRequiredFeatures:",$svelthreeStores[sti].xr.requiredFeatures)
    }

    $svelthreeStores[sti].xr.hitTestMode = hitTestMode
    $svelthreeStores[sti].xr.hitTestModeInitial = $svelthreeStores[sti].xr.hitTestMode

    $: optionalFeatures ? updateOptionalFeatures() : null

    function updateOptionalFeatures(): void {
        $svelthreeStores[sti].xr.optionalFeatures = [...optionalFeatures]
        //console.warn("SVELTHREE > SessionVR > updateOptionalFeatures:", $svelthreeStores[sti].xr.optionalFeatures)
    }

    $: domOverlay ? updateDomOverlay() : null

    function updateDomOverlay(): void {
        $svelthreeStores[sti].xr.domOverlay = domOverlay
        //console.warn("SVELTHREE > SessionVR > updateDomOverlay:", $svelthreeStores[sti].xr.domOverlay)
    }

    $: input ? updateInputType() : null

    function updateInputType(): void {
        $svelthreeStores[sti].xr.inputType = input
        //console.warn("SVELTHREE > SessionVR > updateDomOverlay:", $svelthreeStores[sti].xr.domOverlay)
    }

    $: handProfile ? updateHandProfile() : null

    function updateHandProfile(): void {
        $svelthreeStores[sti].xr.handProfile = handProfile
    }

    /*
    --------- REACTIVE PINCH Configuration ---------
    */

    $: enablePinch ? updateEnablePinch() : null

    function updateEnablePinch(): void {
        $svelthreeStores[sti].xr.enablePinch = enablePinch

        // renderer is not available on init, so this will not be executed twice, only on reactive update!
        if (rendererAvailable) {
            registerPinchConfigs()
        }
    }

    /*
    --------- REACTIVE TOUCH Configuration ---------
    */

    $: enableTouch ? updateEnableTouch() : null

    function updateEnableTouch(): void {
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
    }

    $: $svelthreeStores[sti].xr.leftHandTouchEnabled ? updateLeftHandTouchEnabled() : null

    function updateLeftHandTouchEnabled() {
        if (leftHand) {
            leftHand.userData.touchEnabled = $svelthreeStores[sti].xr.leftHandTouchEnabled
            setTouchInteractivity(leftHand)
        }
    }

    $: $svelthreeStores[sti].xr.leftHandTouchEnabledJoints ? updateLeftHandTouchEnabledJoints() : null

    function updateLeftHandTouchEnabledJoints() {
        leftHand ? (leftHand.userData.enabledJoints = $svelthreeStores[sti].xr.leftHandTouchEnabledJoints) : null
    }

    $: $svelthreeStores[sti].xr.rightHandTouchEnabled ? updateRightHandTouchEnabled() : null

    function updateRightHandTouchEnabled() {
        if (rightHand) {
            rightHand.userData.touchEnabled = $svelthreeStores[sti].xr.rightHandTouchEnabled
            setTouchInteractivity(rightHand)
        }
    }

    $: $svelthreeStores[sti].xr.rightHandTouchEnabledJoints ? updateRightHandTouchEnabledJoints() : null

    function updateRightHandTouchEnabledJoints() {
        rightHand ? (rightHand.userData.enabledJoints = $svelthreeStores[sti].xr.rightHandTouchEnabledJoints) : null
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

    let currentSession: XRSession
    let button: HTMLButtonElement
    let vrButtonAdded: boolean = false

    $: if ($svelthreeStores[sti].canvas.dom && !vrButtonAdded && domOverlay) {
        console.warn(domOverlay)
        createButton()
        $svelthreeStores[sti].xr.sessionMode = sessionMode
        vrButtonAdded = true
    }

    /**
     * Gets available controller instances (three.js), gives them a NAME and sets
     * the HANDEDNESS property on controller.userData ('controller.userData.handedness').
     * It then pushes those controllers to the store --> '$svelthreeStores[sti].xr.controllers'
     */
    function storeControllers() {
        console.warn("SVELTHREE > SessionVR > storeControllers!")

        $svelthreeStores[sti].xr.controllers = XRControllerUtils.getControllers(
            maxControllers,
            $svelthreeStores[sti].renderer.xr
        )
        console.warn(
            "SVELTHREE > SessionVR > getControllers! $svelthreeStores[sti].xr.controllers: ",
            $svelthreeStores[sti].xr.controllers
        )
    }

    /**
     * Adds Listeners to controllers based on the selected controller input type:
     * @see SessionVRInputType ("controller" or "hand")
     */
    function addInputInteraction() {
        console.warn("SVELTHREE > SessionVR > addInputInteraction!")

        switch (input) {
            case XRDefaults.VR_INPUT_TYPE_CONTROLLER:
                addControllerInteraction()
                break
            case XRDefaults.VR_INPUT_TYPE_HAND:
                addHandInteraction()
                break
        }
    }

    function addControllerInteraction() {
        for (let i = 0; i < $svelthreeStores[sti].xr.controllers.length; i++) {
            const controller: Group = $svelthreeStores[sti].xr.controllers[i]
            XRControllerUtils.addListeners(controller, dispatchControllerEvent)
        }
    }

    /**
     * CONTROLLER EVENTS: Universal Event dispatcher for controller of input type "controller"
     * @see performVirtualHitTest is being executed bedfore dispacthing an Event:
     * TODO  Exmanine and maybe refactor
     */

    function dispatchControllerEvent(e) {
        // TOFIX  one controller will overwrite the intersections of the other controller, contemplate and fix!
        // allIntersections is only for 2D with ONE mouse. With hands we save intersections in the hand itself!
        if ($svelthreeStores[sti].raycaster) {
            const allIntersectons: any[] = XRControllerUtils.getRayIntersections(
                $svelthreeStores[sti].raycaster,
                currentScene,
                e.target
            )
            $svelthreeStores[sti].allIntersections = allIntersectons
            const currentHitsTotal = $svelthreeStores[sti].allIntersections.length
            console.warn(
                "SVELTHREE > SessionVR > dispatchControllerEvent > current hits total: ",
                currentHitsTotal,
                $svelthreeStores[sti].allIntersections
            )
        }

        dispatch(e.type, { handedness: e.handedness, target: e.target })
    }

    let leftHand: XRHandModel
    let rightHand: XRHandModel

    function addHandInteraction() {
        for (let i = 0; i < $svelthreeStores[sti].xr.controllers.length; i++) {
            let hand = $svelthreeStores[sti].renderer.xr.getHand(i)

            prepareHandForInteraction(hand, i)

            enablePinch !== undefined ? setPinchInteractivity(hand) : null
            enableTouch !== undefined ? setTouchInteractivity(hand) : null
        }

        if (touchEvents !== undefined) {
            applyHandTouchEvents()
        }

        if (enableTouchX !== undefined) {
            applyHandTouchEventsX()
        }
    }

    function prepareHandForInteraction(hand: XRHandModel, i: number) {
        XRHandUtils.addName(hand, i)
        XRHandUtils.addUserDataHandedness(hand, i)

        if (i === XRControllerDefaults.INDEX_LEFT) {
            hand.userData.touchEnabled = $svelthreeStores[sti].xr.leftHandTouchEnabled
            hand.userData.touchEnabledJoints = $svelthreeStores[sti].xr.leftHandTouchEnabledJoints
        }
        if (i === XRControllerDefaults.INDEX_RIGHT) {
            hand.userData.touchEnabled = $svelthreeStores[sti].xr.rightHandTouchEnabled
            hand.userData.touchEnabledJoints = $svelthreeStores[sti].xr.rightHandTouchEnabledJoints
        }
        assignHandToGlobalInstance(hand, i)
    }

    function assignHandToGlobalInstance(hand: XRHandModel, i: number) {
        i === XRControllerDefaults.INDEX_LEFT ? (leftHand = hand) : null
        i === XRControllerDefaults.INDEX_RIGHT ? (rightHand = hand) : null
    }

    function setPinchInteractivity(hand: XRHandModel) {
        if (hand.userData.pinchConfig) {
            XRHandUtils.PINCH.addListeners(hand, dispatchHandPinchEvent)

            doUpdatePinchRays = true
        }

        // Update hand distances only if pinch-touch is enabled
        // We don't need this for pinch-touch! we're updating the distance
        // to intersection inside xrHandHiTester.updatePinchRay()
        /*
        what we need  TODO  is:
        - create pinchTouchDistance prop
        - pass to xrHandHitTester.updatePinchRay() if we're detecting only touch or both
          and pass to touchDistance or use default value.
        - if we're detecting only touch: SHORTEN the pinch-ray to touch distance
        - if we're detecting both: implement some kind of visual feedback (color / line change)
        -  TODO  Line and visual feedback should be customizable (do it after commit as update)
        */

        /*
        doUpdateHandDistances = true  
        */
    }

    function setTouchInteractivity(hand: XRHandModel) {
        if (hand.userData.touchEnabled) {
            XRHandUtils.TOUCH.addListeners(hand, dispatchHandTouchEvent)

            doUpdateXRTouch = true
        } else {
            removeTouchInteractivity(hand)
        }
    }

    function removeTouchInteractivity(hand: XRHandModel) {
        XRHandUtils.TOUCH.removeListeners(hand, dispatchHandTouchEvent)
        verifyXRTouchUpdating()
    }

    function verifyXRTouchUpdating() {
        if (leftHand.userData.touchEnabled === false && rightHand.userData.touchEnabled === false) {
            doUpdateXRTouch = false
        }
    }

    function applyHandTouchEvents() {
        XRHandUtils.TOUCH.applyEvents(leftHand, rightHand, $svelthreeStores[sti].xr.touchEvents, dispatchHandTouchEvent)
    }

    function applyHandTouchEventsX() {
        XRHandUtils.TOUCHX.applyEventsX(
            leftHand,
            rightHand,
            $svelthreeStores[sti].xr.enableTouchX,
            dispatchHandTouchEventX
        )
    }

    function removeHandsInteractivity() {
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

    let xrHandTouchRay: XRHandTouchRayExt
    let xrHandTouchSphere: XRHandTouchSphereExt

    //EventListener Emulation
    //let doUpdateHandDistances = false
    let doUpdatePinchRays = false
    let doUpdateXRTouch = false

    $: $svelthreeStores[sti].xr.currentFrame.frame ? onXRFrame() : null

    function onXRFrame() {
        //console.log("xr.currentFrame.frame " + $svelthreeStores[sti].xr.currentFrame.delta)

        /*
        if (doUpdateHandDistances) {
            updateHandDistances()
        }
        */

        if (doUpdatePinchRays) {
            updatePinchRays()
        }

        if (doUpdateXRTouch) {
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
                    handProfile,
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
    }

    function createXRHandTouchRayInstance() {
        xrHandTouchRay = new XRHandTouchRayExt(enableTouch.lerpFactor, enableTouch.touchDistance)

        xrHandTouchRay.setLeftHand(leftHand)
        xrHandTouchRay.setRightHand(rightHand)
    }

    function createXRHandTouchSphereInstance() {
        xrHandTouchSphere = new XRHandTouchSphereExt(
            enableTouch.lerpFactor,
            enableTouch.touchDistance,
            enableTouch.sphereRadius
        )

        xrHandTouchSphere.setLeftHand(leftHand)
        xrHandTouchSphere.setRightHand(rightHand)
    }

    /*
    function updateHandDistances(): void {
        let leftHand = $svelthreeStores[sti].renderer.xr.getHand(0)
        let rightHand = $svelthreeStores[sti].renderer.xr.getHand(1)

        for(let i=0; i < enablePinch.length; i++) {
            let item:XRHandPinchConfigItem = enablePinch[i]

                switch (item.hand) {
                    case XRHandTouchDefaults.ENABLED_LEFT:
                        xrHandHitTester.updateHandDistance(
                            leftHand,
                            currentScene,
                            $svelthreeStores[sti].raycaster
                        )
                        break
                    case XRHandTouchDefaults.ENABLED_RIGHT:
                        xrHandHitTester.updateHandDistance(
                            rightHand,
                            currentScene,
                            $svelthreeStores[sti].raycaster
                        )
                        break
                    case XRHandTouchDefaults.ENABLED_BOTH:
                        xrHandHitTester.updateHandDistance(
                            leftHand,
                            currentScene,
                            $svelthreeStores[sti].raycaster
                        )
                        xrHandHitTester.updateHandDistance(
                            rightHand,
                            currentScene,
                            $svelthreeStores[sti].raycaster
                        )
                        break
                    default:
                        break
            }
        }
    }
    */

    function updatePinchRays(): void {
        $svelthreeStores[sti].xr.leftHandPinchEnabled
            ? xrHandHitTester.updatePinchRay(leftHand, currentScene, $svelthreeStores[sti].raycaster)
            : null

        $svelthreeStores[sti].xr.rightHandPinchEnabled
            ? xrHandHitTester.updatePinchRay(rightHand, currentScene, $svelthreeStores[sti].raycaster)
            : null
    }

    function dispatchHandPinchEvent(e) {
        // Was kommt hier an was machen wird damit?

        /*
        if ($svelthreeStores[sti].raycaster) {
            performVirtualHitTest(e.target)
        }
        */
        /*
        if (e.target.handedness === enablePinch || enablePinch === "both") {
            xrHandHitTester.updatePinchRay(
                e.target,
                currentScene,
                $svelthreeStores[sti].raycaster
            )
        }
        */

        dispatch(e.type, { handedness: e.handedness, target: e.target })
    }

    function dispatchHandTouchEvent(e) {
        console.warn("--------------> HAND TOUCH EVENT! <------------------- :", e.type)

        //debugger

        dispatch(e.type, { handedness: e.handedness, target: e.target })
    }

    function dispatchHandTouchEventX(e) {
        console.warn("--------------> HAND TOUCH EVENT X! <------------------- :", e.type)

        //debugger

        dispatch(e.type, { handedness: e.handedness, target: e.target })
    }

    let controllerModelFactory: XRControllerModelFactory = new XRControllerModelFactory()
    let handModelFactory: XRHandModelFactory = new XRHandModelFactory().setPath(pathToHandModels)

    /**
     * We have to add the AR controller to the scene BEFORE hit test in order for it
     * to have proper matrixWorld on 'select' (first click after hitTestMode change)
     */

    // TODO : apply this kind of "hack" everywhere if needed

    //BAD practice
    //$: hitTestMode === XRDefaults.HITTEST_MODE_VIRTUAL && $svelthreeStores[sti].currentSceneIndex ? tryAddingControllerToScene() : null // executed on every flush / update

    // GOOD practice (prevent unnecessary function calls)

    let currentSceneIndex = undefined
    $: if ($svelthreeStores[sti].currentSceneIndex) {
        currentSceneIndex = $svelthreeStores[sti].currentSceneIndex
    }

    /*
   -------------- ENTRY POINT ---------------- 
   */

    $: if (rendererAvailable && currentSceneIndex) {
        console.warn("SVELTHREE > SessionVR > currentSceneIndex: ", currentSceneIndex)

        addGlobalCoords()
        storeControllers()

        if (enablePinch) {
            registerPinchConfigs()
        }

        addInputInteraction()
        tryAddingControllersToScene()
    }

    /*
    -------------------------------------------
    */

    let leftHandPinchEnabled = false
    let rightHandPinchEnabled = false

    function registerPinchConfigs() {
        let lefthand: XRHandModel = $svelthreeStores[sti].renderer.xr.getHand(XRControllerDefaults.INDEX_LEFT)
        let righthand: XRHandModel = $svelthreeStores[sti].renderer.xr.getHand(XRControllerDefaults.INDEX_RIGHT)

        for (let i = 0; i < enablePinch.length; i++) {
            let item: XRHandPinchConfigItem = enablePinch[i]

            if (item.hand === XRHandTouchDefaults.ENABLED_LEFT) {
                registerPinchConfig(leftHand, item)
                leftHandPinchEnabled = true
            }
            if (item.hand === XRHandTouchDefaults.ENABLED_RIGHT) {
                registerPinchConfig(rightHand, item)
                rightHandPinchEnabled = true
            }

            if (item.hand === XRHandTouchDefaults.ENABLED_BOTH) {
                registerPinchConfig(leftHand, item)
                registerPinchConfig(rightHand, item)
                leftHandPinchEnabled = true
                rightHandPinchEnabled = true
            }
        }

        $svelthreeStores[sti].xr.leftHandPinchEnabled = leftHandPinchEnabled
        $svelthreeStores[sti].xr.rightHandPinchEnabled = rightHandPinchEnabled
    }

    function registerPinchConfig(hand: XRHandModel, item: XRHandPinchConfigItem) {
        !hand.userData.pinchConfig ? (hand.userData.pinchConfig = {}) : null
        hand.userData.pinchConfig = item
    }

    let rendererAvailable = false
    $: if ($svelthreeStores[sti].renderer) {
        rendererAvailable = true
    }

    function addGlobalCoords() {
        let currentScene = $svelthreeStores[sti].scenes[$svelthreeStores[sti].currentSceneIndex - 1].scene

        let globalCoord = xrHelpers.getCoordsHelper()
        globalCoord.scale.set(5, 5, 5)
        currentScene.add(globalCoord)
    }

    function tryAddingControllersToScene() {
        console.warn("SVELTHREE > SessionVR > tryAddingControllersToScene!")
        let currentScene = $svelthreeStores[sti].scenes[$svelthreeStores[sti].currentSceneIndex - 1].scene

        console.warn("SVELTHREE > SessionVR > tryAddingControllersToScene! currentScene:", currentScene)

        for (let i = 0; i < $svelthreeStores[sti].xr.controllers.length; i++) {
            if ($svelthreeStores[sti].xr.controllers[i].parent !== currentScene) {
                console.warn(
                    "SVELTHREE > SessionVR > tryAddingControllersToScene! $svelthreeStores[sti].xr.controllers[i]:",
                    $svelthreeStores[sti].xr.controllers[i]
                )

                switch (input) {
                    case XRDefaults.VR_INPUT_TYPE_CONTROLLER:
                        addController(i, currentScene)
                        break
                    case XRDefaults.VR_INPUT_TYPE_HAND:
                        addHand(i, currentScene)
                        break
                }

                console.warn(
                    "SVELTHREE > SessionVR > tryAddingControllersToScene! $svelthreeStores[sti].xr.controllers[i] (after line added):",
                    $svelthreeStores[sti].xr.controllers[i]
                )
            }
        }
    }

    /**
     * TODO  Back to the roots: test controllers!
     */
    function addController(i: number, currentScene: Scene) {
        currentScene.add($svelthreeStores[sti].xr.controllers[i])

        let controllerGrip = $svelthreeStores[sti].renderer.xr.getControllerGrip(i)

        console.warn("SVELTHREE > SessionVR > tryAddingControllersToScene! controllerGrip:", controllerGrip)

        controllerGrip.add(controllerModelFactory.createControllerModel(controllerGrip))

        currentScene.add(controllerGrip)

        console.warn("SVELTHREE > SessionVR > tryAddingControllersToScene! currentScene:", currentScene)

        // Add pointer ray to controller
        $svelthreeStores[sti].xr.controllers[i].add(xrHelpers.controllerRay.clone())
    }

    /**
     * TODO  Test and understand this!
     * TODO  What happens if we're in hand mode but grab the controllers?! (I think I tested that allready)
     */
    function addHand(i: number, currentScene: Scene) {
        // We're adding controllers AND Hands
        currentScene.add($svelthreeStores[sti].xr.controllers[i])

        let controllerGrip = $svelthreeStores[sti].renderer.xr.getControllerGrip(i)

        console.warn("SVELTHREE > SessionVR > tryAddingControllersToScene! controllerGrip:", controllerGrip)

        controllerGrip.add(controllerModelFactory.createControllerModel(controllerGrip))

        currentScene.add(controllerGrip)

        console.warn("SVELTHREE > SessionVR > tryAddingControllersToScene! currentScene:", currentScene)

        // Don't add pointer ray to controller
        //$svelthreeStores[sti].xr.controllers[i].add(line.clone())

        //add hand

        let handAsGroup: Group = $svelthreeStores[sti].renderer.xr.getHand(i)
        let handAsXRHandModel: XRHandModel = handModelFactory.createHandModel(handAsGroup, handProfile)

        //xrHelpers.addHandHelpers(xrhand, i)

        handAsGroup.add(handAsXRHandModel)

        //hand.add(line.clone()) // linie liegt einfach auf dem boden

        currentScene.add(handAsGroup)
    }

    // ---- VR Hit Test ----

    let currentScene: Scene
    $: $svelthreeStores[sti].currentSceneIndex ? updateCurrentScene() : null

    function updateCurrentScene(): void {
        currentScene = $svelthreeStores[sti].scenes[$svelthreeStores[sti].currentSceneIndex - 1].scene
    }

    // VR Button creation
    function createButton(): void {
        if ("xr" in navigator) {
            button = document.createElement("button")
            button.id = "VRButton"
            button.style.display = "none"
            button.classList.add(btnClass)

            navigator.xr
                .isSessionSupported(sessionMode)
                .then(function (supported) {
                    supported ? showEnterVR() : showVRNotSupported()
                })
                .catch(showVRNotSupported)

            //return button
            domOverlay.appendChild(button)
        } else {
            var message = document.createElement("a")

            if (window.isSecureContext === false) {
                message.href = document.location.href.replace(/^http:/, "https:")
                message.innerHTML = btnTxt.notSecure ? btnTxt.notSecure : "WEBXR NEEDS HTTPS" // TODO Improve message (original three.js comment)
            } else {
                message.href = "https://immersiveweb.dev/"
                message.innerHTML = btnTxt.noXR ? btnTxt.noXR : "WEBXR NOT AVAILABLE"
            }

            message.style.left = "calc(50% - 90px)"
            message.style.width = "180px"
            message.style.textDecoration = "none"
            message.classList.add(btnClass)

            //return message
            domOverlay.appendChild(message)
        }

        function showEnterVR(/*device*/): void {
            currentSession = null

            function onSessionStarted(session: XRSession) {
                /**
                 * concerning domOverlay:
                 * session.domOverlayState.type is now set if supported,
                 * or is null if the feature is not supported.
                 */

                session.addEventListener("end", onSessionEnded)

                $svelthreeStores[sti].renderer.xr.setSession(session)

                button.textContent = btnTxt.stop ? btnTxt.stop : "EXIT VR"

                currentSession = session

                dispatch("started", { session: currentSession })
            }

            function onSessionEnded(/*event*/): void {
                currentSession.removeEventListener("end", onSessionEnded)
                button.textContent = btnTxt.start ? btnTxt.start : "ENTER VR"

                //remove hand interaction
                removeHandsInteractivity()

                //reset store
                $svelthreeStores[sti].renderer.xr.setSession(null)
                $svelthreeStores[sti].allIntersections = undefined

                $svelthreeStores[sti].renderer = undefined
                //$svelthreeStores[sti].raycaster = undefined // reuse initally created raycaster (Canvas)

                $svelthreeStores[sti].scenes = []
                $svelthreeStores[sti].currentSceneIndex = undefined
                $svelthreeStores[sti].cameras = []
                $svelthreeStores[sti].activeCamera = undefined

                $svelthreeStores[sti].xr.controller = undefined
                $svelthreeStores[sti].xr.hitTestSource = null
                $svelthreeStores[sti].xr.hitTestSourceRequested = false
                $svelthreeStores[sti].xr.hitTestResults = undefined
                $svelthreeStores[sti].xr.reticle = undefined

                currentSession = null
                currentSceneIndex = undefined

                dispatch("ended")
            }

            button.style.display = ""
            button.style.cursor = "pointer"
            button.style.left = "calc(50% - 50px)"
            button.style.width = "100px"

            button.textContent = btnTxt.start ? btnTxt.start : "ENTER VR"

            button.onmouseenter = function (): void {
                button.style.opacity = "1.0"
            }

            button.onmouseleave = function () {
                button.style.opacity = "0.5"
            }

            button.onclick = function (): void {
                if (currentSession === null) {
                    navigator.xr
                        .requestSession(sessionMode, {
                            requiredFeatures: requiredFeatures,
                            optionalFeatures: optionalFeatures
                        })
                        .then((session) => {
                            dispatch("ready", { session: currentSession })
                            tryOnSessionStarted(session)
                        })
                } else {
                    currentSession.end()
                }
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
        }

        function disableButton(): void {
            button.style.display = ""

            button.style.cursor = "auto"
            button.style.left = "calc(50% - 75px)"
            button.style.width = "150px"

            button.onmouseenter = null
            button.onmouseleave = null

            button.onclick = null
        }

        function showVRNotSupported(): void {
            disableButton()

            button.textContent = btnTxt.noVR ? btnTxt.noVR : "VR NOT SUPPORTED"
        }
    }

    onMount(() => {
        console.info("SVELTHREE > onMount : SessionVR")
    })
</script>
