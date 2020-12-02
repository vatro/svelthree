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
    import {
        Vector3,
        Quaternion,
        Object3D,
        Group,
        Matrix4,
        XRControllerModelFactory,
        XRHandModelFactory,
        BufferGeometry,
        BufferAttribute,
        Scene,
        Line,
        LineBasicMaterial,
        LineDashedMaterial,
        MeshStandardMaterial
    } from "svelthree-three"

    import XRHandTouchTestModes from "../utils/XRHandTouchTestModes"
    import XRHandTouchDefaults from "../utils/XRHandTouchDefaults"

    let dispatch: (type: string, detail?: any) => void = createEventDispatcher()

    export let sti: number

    if (sti === undefined) {
        console.warn("SVELTHREE > SessionVR : You have to provide a {sti} prop for the WebGLRenderer component!", {
            sti: sti
        })
        throw new Error("SVELTHREE Exception (see warning above)")
    }

    const sessionMode: XRSessionMode = "immersive-vr"
    export let requiredFeatures: string[] = undefined
    const hitTestMode: XRHitTestMode = "virtual" // no real world testing in VR
    export let optionalFeatures: string[] = undefined // 'local-floor', 'bounded-floor', 'hand-tracking'
    export let btnClass: string = undefined
    export let btnTxt: { [key: string]: string } = undefined
    export let domOverlay: HTMLDivElement = undefined
    export let maxControllers: number = 2 // defualt 2 controllers
    export let input: SessionVRInputType = "controller" // default is input via controller
    export let pathToHandModels: string = "./models/fbx/"
    export let handProfile: XRHandProfile = undefined // "spheres", "boxes", "oculus"

    let pinchRemoteLineMat = new LineBasicMaterial({
        color: 0x000000,
        linewidth: 3
    })

    let pinchTouchLineMat = new LineDashedMaterial({
        color: 0x000000,
        linewidth: 3,
        scale: 1,
        dashSize: 0.01,
        gapSize: 0.01
    })

    export let enablePinch: XRHandPinchConfig = undefined
    export let enableTouch: XRHandTouchConfig = undefined
    export let touchEvents: XRHandTouchEvents = undefined
    export let enableTouchX: XRHandTouchXConfig = undefined

    let xrHelpers: SvelthreeHelpersXR = new SvelthreeHelpersXR()
    let xrHandHitTester: XRHandHitTester = new XRHandHitTester()

    let xrHandTouchRay: XRHandTouchRayExt = new XRHandTouchRayExt(enableTouch.lerpFactor, enableTouch.touchDistance)

    let xrHandTouchSphere: XRHandTouchSphereExt = new XRHandTouchSphereExt(
        enableTouch.lerpFactor,
        enableTouch.touchDistance,
        enableTouch.sphereRadius
    )

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

    $: enablePinch ? updateEnablePinch() : null
    function updateEnablePinch(): void {
        $svelthreeStores[sti].xr.enablePinch = enablePinch

        //renderer is not available on init, so this will not be executed twice, only on reactive update!
        if (rendererAvailable) {
            registerPinchConfigs()
        }
    }

    $: handProfile ? updateHandProfile() : null
    function updateHandProfile(): void {
        $svelthreeStores[sti].xr.handProfile = handProfile
    }

    let leftHandTouchEnabled = false
    let leftHandTouchEnabledJoints = []
    let rightHandTouchEnabled = false
    let rightHandTouchEnabledJoints = []

    $: enableTouch ? updateEnableTouch() : null
    function updateEnableTouch(): void {
        $svelthreeStores[sti].xr.enableTouch = enableTouch

        if ($svelthreeStores[sti].xr.enableTouch.hands) {
            for (let i = 0; i < $svelthreeStores[sti].xr.enableTouch.hands.length; i++) {
                let item: XRHandTouchConfigHandsItem = $svelthreeStores[sti].xr.enableTouch.hands[i]
                if (item.hand === "right") {
                    rightHandTouchEnabled = true
                    if (item.index.length > 0) {
                        rightHandTouchEnabledJoints = rightHandTouchEnabledJoints.concat(item.index)
                    }
                }

                if (item.hand === "left") {
                    leftHandTouchEnabled = true
                    if (item.index.length > 0) {
                        leftHandTouchEnabledJoints = leftHandTouchEnabledJoints.concat(item.index)
                    }
                }

                if (item.hand === "both") {
                    leftHandTouchEnabled = true
                    rightHandTouchEnabled = true
                    if (item.index.length > 0) {
                        leftHandTouchEnabledJoints = leftHandTouchEnabledJoints.concat(item.index)
                        rightHandTouchEnabledJoints = rightHandTouchEnabledJoints.concat(item.index)
                    }
                }
            }
        } else {
            // default: "both"
            leftHandTouchEnabled = true
            rightHandTouchEnabled = true
            $svelthreeStores[sti].xr.enableTouch.hands = XRHandTouchDefaults.ENABLETOUCH_HANDS_DEFAULT
            leftHandTouchEnabledJoints = leftHandTouchEnabledJoints.concat(
                XRHandTouchDefaults.ENABLETOUCH_HANDS_DEFAULT[0].index
            )
            rightHandTouchEnabledJoints = rightHandTouchEnabledJoints.concat(
                XRHandTouchDefaults.ENABLETOUCH_HANDS_DEFAULT[0].index
            )
        }

        $svelthreeStores[sti].xr.leftHandTouchEnabled = leftHandTouchEnabled
        $svelthreeStores[sti].xr.leftHandTouchEnabledJoints = leftHandTouchEnabledJoints
        $svelthreeStores[sti].xr.rightHandTouchEnabled = rightHandTouchEnabled
        $svelthreeStores[sti].xr.rightHandTouchEnabledJoints = rightHandTouchEnabledJoints
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

    /*
    $: if ($svelthreeStores[sti].renderer && currentSession && $svelthreeStores[sti].xr.controllers.length === 0) {
        
        getControllers()
        addInputListeners()
    }
    */

    function getControllers() {
        console.warn("SVELTHREE > SessionVR > getControllers!")
        for (let i = 0; i < maxControllers; i++) {
            let controller = $svelthreeStores[sti].renderer.xr.getController(i)

            if (i === 0) {
                controller.name = "LEFT CONTROLLER"
                controller.userData.handedness = "left"
            }

            if (i === 1) {
                controller.name = "RIGHT CONTROLLER"
                controller.userData.handedness = "right"
            }

            $svelthreeStores[sti].xr.controllers.push(controller)
            console.warn(
                "SVELTHREE > SessionVR > getControllers! $svelthreeStores[sti].xr.controllers: ",
                $svelthreeStores[sti].xr.controllers
            )
        }
    }

    function addInputListeners() {
        console.warn("SVELTHREE > SessionVR > addInputListeners!")

        switch (input) {
            case "controller":
                addControllerListeners()
                break
            case "hand":
                addHandListeners()
                break
        }
    }

    function addControllerListeners() {
        for (let i = 0; i < $svelthreeStores[sti].xr.controllers.length; i++) {
            let controller = $svelthreeStores[sti].xr.controllers[i]

            controller.addEventListener("select", dispatchControllerEvent)
            controller.addEventListener("selectstart", dispatchControllerEvent)
            controller.addEventListener("selectend", dispatchControllerEvent)
            controller.addEventListener("squeeze", dispatchControllerEvent)
            controller.addEventListener("squeezestart", dispatchControllerEvent)
            controller.addEventListener("squeezeend", dispatchControllerEvent)

            console.warn(
                "SVELTHREE > SessionVR > addInputListeners! $svelthreeStores[sti].xr.controllers[i]: ",
                $svelthreeStores[sti].xr.controllers[i]
            )
        }
    }

    function dispatchControllerEvent(e) {
        if ($svelthreeStores[sti].raycaster) {
            performVirtualHitTest(e.target)
        }

        dispatch(e.type, { handedness: e.handedness, target: e.target })
    }

    let leftHand: Group
    let rightHand: Group

    function addHandListeners() {
        for (let i = 0; i < $svelthreeStores[sti].xr.controllers.length; i++) {
            let hand = $svelthreeStores[sti].renderer.xr.getHand(i)

            if (i === 0) {
                hand.name = "LEFT HAND"
                hand.userData.handedness = "left"
                leftHand = hand
            }

            if (i === 1) {
                hand.name = "RIGHT HAND"
                hand.userData.handedness = "right"
                rightHand = hand
            }

            // Activate hand distance and pinch control (on every xr frame)
            if (enablePinch !== undefined) {
                // Custom three.js Event defined inside WebXRController.js

                if (hand.userData.pinchConfig) {
                    hand.addEventListener("pinchstart", dispatchHandPinchEvent)
                    hand.addEventListener("pinchend", dispatchHandPinchEvent)
                }

                doUpdatePinchRays = true
            }

            // Update hand distances only if pinch-touch is enabled
            // We don't need this for pinch-touch! we're updating the distance
            // to intersection inside xrHandHiTester.updatePinchRay()
            /*
            what we need  TODO  is:
                - create pinchTouchDistance prop
                - pass to xrHandHiTester.updatePinchRay() if we're detecting only touch or both
                  and pass to touchDistance or use default value.
                - if we're detecting only touch: SHORTEN the pinch-ray to touch distance
                - if we're detecting both: implement some kind of visual feedback (color / line change)
                -  TODO  Line and visual feedback should be customizable (do it after commit as update)
            */

            /*
            if(enablePinch !== undefined) {
                doUpdateHandDistances = true
            }
            */

            // Activate hands touch
            if (enableTouch !== undefined) {
                hand.addEventListener("touchstart", dispatchHandTouchEvent)
                hand.addEventListener("touchend", dispatchHandTouchEvent)

                xrHandTouchRay.setLeftHand(leftHand)
                xrHandTouchRay.setRightHand(rightHand)

                doUpdateXRTouch = true
            }
        }

        if (touchEvents !== undefined) {
            applyHandTouchEvents()
        }

        if (enableTouchX !== undefined) {
            applyHandTouchEventsX()
        }
    }

    function applyHandTouchEvents(): void {
        console.warn("SVELTHREE > SessionVR > applyHandTouchEvents!")

        //let leftHand = $svelthreeStores[sti].renderer.xr.getHand(0)
        //let rightHand = $svelthreeStores[sti].renderer.xr.getHand(1)

        for (let i = 0; i < $svelthreeStores[sti].xr.touchEvents.length; i++) {
            let item: XRHandTouchEventsItem = $svelthreeStores[sti].xr.touchEvents[i]

            if (item.hand === "left") {
                leftHand.addEventListener(item.name + "start", dispatchHandTouchEvent)
                leftHand.addEventListener(item.name + "end", dispatchHandTouchEvent)
                registerHandTouchEvent(leftHand, item)
            }

            if (item.hand === "right") {
                rightHand.addEventListener(item.name + "start", dispatchHandTouchEvent)
                rightHand.addEventListener(item.name + "end", dispatchHandTouchEvent)
                registerHandTouchEvent(rightHand, item)
            }

            if (item.hand === "both") {
                rightHand.addEventListener(item.name + "start", dispatchHandTouchEvent)
                rightHand.addEventListener(item.name + "end", dispatchHandTouchEvent)
                leftHand.addEventListener(item.name + "start", dispatchHandTouchEvent)
                leftHand.addEventListener(item.name + "end", dispatchHandTouchEvent)
                registerHandTouchEvent(leftHand, item)
                registerHandTouchEvent(rightHand, item)
            }
        }
    }

    function applyHandTouchEventsX(): void {
        console.warn("SVELTHREE > SessionVR > applyHandTouchEventsX!")

        //let leftHand = $svelthreeStores[sti].renderer.xr.getHand(0)
        //let rightHand = $svelthreeStores[sti].renderer.xr.getHand(1)

        for (let i = 0; i < $svelthreeStores[sti].xr.enableTouchX.length; i++) {
            let item: XRHandTouchXConfigItem = $svelthreeStores[sti].xr.enableTouchX[i]

            if (item.hand === "left") {
                leftHand.addEventListener(item.name + "start", dispatchHandTouchEventX)
                leftHand.addEventListener(item.name + "end", dispatchHandTouchEventX)
                registerHandTouchEventX(leftHand, item)
            }

            if (item.hand === "right") {
                rightHand.addEventListener(item.name + "start", dispatchHandTouchEventX)
                rightHand.addEventListener(item.name + "end", dispatchHandTouchEventX)
                registerHandTouchEventX(rightHand, item)
            }

            if (item.hand === "both") {
                leftHand.addEventListener(item.name + "start", dispatchHandTouchEventX)
                leftHand.addEventListener(item.name + "end", dispatchHandTouchEventX)
                rightHand.addEventListener(item.name + "start", dispatchHandTouchEventX)
                rightHand.addEventListener(item.name + "end", dispatchHandTouchEventX)
                registerHandTouchEventX(leftHand, item)
                registerHandTouchEventX(rightHand, item)
            }
        }
    }

    function registerHandTouchEvent(hand: Group, item: { [key: string]: any }) {
        !hand.userData.touchEvent ? (hand.userData.touchEvent = {}) : null
        !hand.userData.touchEvent[item.name] ? (hand.userData.touchEvent[item.name] = {}) : null
        hand.userData.touchEvent[item.name].requiredTouchingJoints = item.index
    }

    function registerHandTouchEventX(hand: Group, item: { [key: string]: any }) {
        !hand.userData.touchEventX ? (hand.userData.touchEventX = {}) : null
        !hand.userData.touchEventX[item.name] ? (hand.userData.touchEventX[item.name] = {}) : null
        hand.userData.touchEventX[item.name].requiredJoints = item.index
        hand.userData.touchEventX[item.name].distance = item.distance
        hand.userData.touchEventX[item.name].touchtime = item.touchtime
    }

    function unregisterHandTouchEvents(hand: Group) {
        hand.userData.touchEvent = undefined
    }

    function unregisterHandTouchEventsX(hand: Group) {
        hand.userData.touchEventX = undefined
    }

    function removeHandListeners() {
        for (let i = 0; i < $svelthreeStores[sti].xr.controllers.length; i++) {
            let hand = $svelthreeStores[sti].renderer.xr.getHand(i)

            hand.removeEventListener("pinchstart", dispatchHandPinchEvent)
            hand.removeEventListener("pinchend", dispatchHandPinchEvent)

            hand.removeEventListener("touchstart", dispatchHandTouchEvent)
            hand.removeEventListener("touchend", dispatchHandTouchEvent)

            unregisterHandTouchEvents(hand)
            unregisterHandTouchEventsX(hand)
        }
    }

    //EventListener Emulation
    //let doUpdateHandDistances = false
    let doUpdatePinchRays = false
    let doUpdateXRTouch = false

    $: if ($svelthreeStores[sti].xr.currentFrame.frame) {
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
                switch (enableTouch.mode) {
                    case "ray":
                        updateXRTouchRay()
                        break
                    case "sphere":
                        updateXRTouchSphere()
                        break
                    default:
                        updateXRTouchRay()
                        break
                }
            }
        }
    }

    /*
    function updateHandDistances(): void {
        let leftHand = $svelthreeStores[sti].renderer.xr.getHand(0)
        let rightHand = $svelthreeStores[sti].renderer.xr.getHand(1)

        for(let i=0; i < enablePinch.length; i++) {
            let item:XRHandPinchConfigItem = enablePinch[i]

                switch (item.hand) {
                    case "left":
                        xrHandHitTester.updateHandDistance(
                            leftHand,
                            currentScene,
                            $svelthreeStores[sti].raycaster
                        )
                        break
                    case "right":
                        xrHandHitTester.updateHandDistance(
                            rightHand,
                            currentScene,
                            $svelthreeStores[sti].raycaster
                        )
                        break
                    case "both":
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
        //let leftHand = $svelthreeStores[sti].renderer.xr.getHand(0)
        //let rightHand = $svelthreeStores[sti].renderer.xr.getHand(1)

        $svelthreeStores[sti].xr.leftHandPinchEnabled
            ? xrHandHitTester.updatePinchRay(leftHand, currentScene, $svelthreeStores[sti].raycaster)
            : null

        $svelthreeStores[sti].xr.rightHandPinchEnabled
            ? xrHandHitTester.updatePinchRay(rightHand, currentScene, $svelthreeStores[sti].raycaster)
            : null
    }

    function updateXRTouchRay(): void {
        //console.log("updateXRTouchRay!")

        //console.time("updateXRTouchRay updates")
        // 0.01x ms - very low
        xrHandTouchRay.updateToTest(currentScene)
        xrHandTouchRay.updateBVH($svelthreeStores[sti].useBVH)
        // TODO: implement NEW debugging
        // enableTouch.debug ? xrHandTouchRay.updateDebug(true) : xrHandTouchRay.updateDebug(false)

        if (enableTouch.debug) {
            xrHandTouchRay.updateDebug(enableTouch.debug.enabled)

            if (enableTouch.debug.enabled && !xrHandTouchRay.debuggerInitiated) {
                xrHandTouchRay.setDebugger(enableTouch.debug)
            }
        }

        //console.timeEnd("updateXRTouchRay updates")

        //console.time("updateXRTouchRay update params")
        // 0.007 ms - almost nothing!
        let params: XRTouchRayUpdateParams = {
            handProfile: handProfile,
            raycaster: $svelthreeStores[sti].raycaster,
            xrFrameDelta: $svelthreeStores[sti].xr.currentFrame.delta
        }

        //console.timeEnd("updateXRTouchRay update params")

        //console.time("updateXRTouchRay hands update")
        // 0.09 - 0.4 (TOUCH AND TOUCH INSIDE) - 1.74 ms (FAST TOUCH CHECK)
        if (leftHand && $svelthreeStores[sti].xr.leftHandTouchEnabled === true) {
            //console.log("updateXRTouchRay left!")
            xrHandTouchRay.update(leftHand, params, $svelthreeStores[sti].xr.leftHandTouchEnabledJoints)
        }

        if (rightHand && $svelthreeStores[sti].xr.rightHandTouchEnabled === true) {
            //console.log("updateXRTouchRay right!")
            xrHandTouchRay.update(rightHand, params, $svelthreeStores[sti].xr.rightHandTouchEnabledJoints)
        }
        //console.timeEnd("updateXRTouchRay hands update")
    }

    function updateXRTouchSphere(): void {
        //console.log("updateXRTouchSphere!")

        //console.time("updateXRTouchSphere updates")
        xrHandTouchSphere.updateToTest(currentScene)
        xrHandTouchSphere.updateBVH($svelthreeStores[sti].useBVH)
        // TODO: implement NEW debugging
        //enableTouch.debug ? xrHandTouchSphere.updateDebug(true) : xrHandTouchSphere.updateDebug(false)

        if (enableTouch.debug) {
            xrHandTouchSphere.updateDebug(enableTouch.debug.enabled)

            if (enableTouch.debug.enabled && !xrHandTouchSphere.debuggerInitiated) {
                xrHandTouchSphere.setDebugger(enableTouch.debug)
            }
        }

        //console.timeEnd("updateXRTouchSphere updates")

        //console.time("updateXRTouchSphere update params")
        let params: XRTouchSphereUpdateParams = {
            handProfile: handProfile,
            raycaster: $svelthreeStores[sti].raycaster,
            xrFrameDelta: $svelthreeStores[sti].xr.currentFrame.delta
        }
        //console.timeEnd("updateXRTouchRay update params")

        //console.time("updateXRTouchSphere hands update")
        // 0.09 - 0.4 (TOUCH AND TOUCH INSIDE) - 1.74 ms (FAST TOUCH CHECK)
        if (leftHand && $svelthreeStores[sti].xr.leftHandTouchEnabled === true) {
            //console.log("updateXRTouchRay left!")
            xrHandTouchSphere.update(leftHand, params, $svelthreeStores[sti].xr.leftHandTouchEnabledJoints)
        }

        if (rightHand && $svelthreeStores[sti].xr.rightHandTouchEnabled === true) {
            //console.log("updateXRTouchRay right!")
            xrHandTouchSphere.update(rightHand, params, $svelthreeStores[sti].xr.rightHandTouchEnabledJoints)
        }
        //console.timeEnd("updateXRTouchSphere hands update")
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
    //$: hitTestMode === "virtual" && $svelthreeStores[sti].currentSceneIndex ? tryAddingControllerToScene() : null // executed on every flush / update

    // GOOD practice (prevent unnecessary function calls)

    let currentSceneIndex = undefined
    $: if ($svelthreeStores[sti].currentSceneIndex) {
        currentSceneIndex = $svelthreeStores[sti].currentSceneIndex
    }

    $: if (rendererAvailable && currentSceneIndex) {
        console.warn("SVELTHREE > SessionVR > currentSceneIndex: ", currentSceneIndex)

        addGlobalCoords()
        getControllers()
        if (enablePinch) {
            registerPinchConfigs()
        }
        addInputListeners()
        tryAddingControllersToScene()
    }

    let leftHandPinchEnabled = false
    let rightHandPinchEnabled = false

    function registerPinchConfigs() {
        let leftHand: Group = $svelthreeStores[sti].renderer.xr.getHand(0)
        let rightHand: Group = $svelthreeStores[sti].renderer.xr.getHand(1)

        for (let i = 0; i < enablePinch.length; i++) {
            let item: XRHandPinchConfigItem = enablePinch[i]

            if (item.hand === "left") {
                registerPinchConfig(leftHand, item)
                leftHandPinchEnabled = true
            }
            if (item.hand === "right") {
                registerPinchConfig(rightHand, item)
                rightHandPinchEnabled = true
            }

            if (item.hand === "both") {
                registerPinchConfig(leftHand, item)
                registerPinchConfig(rightHand, item)
                leftHandPinchEnabled = true
                rightHandPinchEnabled = true
            }
        }

        $svelthreeStores[sti].xr.leftHandPinchEnabled = leftHandPinchEnabled
        $svelthreeStores[sti].xr.rightHandPinchEnabled = rightHandPinchEnabled
    }

    function registerPinchConfig(hand: Group, item: XRHandPinchConfigItem) {
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
                    case "controller":
                        addController(i, currentScene)
                        break
                    case "hand":
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

    function addController(i: number, currentScene: Scene) {
        currentScene.add($svelthreeStores[sti].xr.controllers[i])

        let controllerGrip = $svelthreeStores[sti].renderer.xr.getControllerGrip(i)

        console.warn("SVELTHREE > SessionVR > tryAddingControllersToScene! controllerGrip:", controllerGrip)

        controllerGrip.add(controllerModelFactory.createControllerModel(controllerGrip))

        currentScene.add(controllerGrip)

        console.warn("SVELTHREE > SessionVR > tryAddingControllersToScene! currentScene:", currentScene)

        $svelthreeStores[sti].xr.controllers[i].add(xrHelpers.controllerRay.clone())
    }

    function addHand(i: number, currentScene: Scene) {
        currentScene.add($svelthreeStores[sti].xr.controllers[i])

        let controllerGrip = $svelthreeStores[sti].renderer.xr.getControllerGrip(i)

        console.warn("SVELTHREE > SessionVR > tryAddingControllersToScene! controllerGrip:", controllerGrip)

        controllerGrip.add(controllerModelFactory.createControllerModel(controllerGrip))

        currentScene.add(controllerGrip)

        console.warn("SVELTHREE > SessionVR > tryAddingControllersToScene! currentScene:", currentScene)

        //$svelthreeStores[sti].xr.controllers[i].add(line.clone())

        //add hand

        let hand = $svelthreeStores[sti].renderer.xr.getHand(i)
        let xrhand = handModelFactory.createHandModel(hand, handProfile)

        //addHandHelpers(xrhand, i)

        hand.add(xrhand)

        //hand.add(line.clone()) // linie liegt einfach auf dem boden

        currentScene.add(hand)
    }

    let tip: number[] = [4, 9, 14, 19, 24]
    let distal: number[] = [3, 8, 13, 18, 23]
    let intermediate: number[] = [7, 12, 17, 22]
    let proximal: number[] = [2, 6, 11, 16, 21]
    let metacarpal: number[] = [1, 5, 10, 15, 20]

    let joints: number[] = distal.concat(intermediate, proximal, metacarpal)

    function addHandHelpers(xrhand, i: number) {
        let coordsScale: number = 0.0125
        let tipRay: Line
        let stdRay: Line
        let dirRayFwd: Line
        let dirRayDwn: Line
        let dirRayPunch: Line

        i == 0 ? (tipRay = xrHelpers.tipRayL) : null
        i == 1 ? (tipRay = xrHelpers.tipRayR) : null
        i == 0 ? (stdRay = xrHelpers.stdRayL) : null
        i == 1 ? (stdRay = xrHelpers.stdRayR) : null
        i == 0 ? (dirRayFwd = xrHelpers.dirRayLfwd) : null
        i == 1 ? (dirRayFwd = xrHelpers.dirRayRfwd) : null
        i == 0 ? (dirRayDwn = xrHelpers.dirRayLdwn) : null
        i == 1 ? (dirRayDwn = xrHelpers.dirRayRdwn) : null
        i == 0 ? (dirRayPunch = xrHelpers.dirRayLpunch) : null
        i == 1 ? (dirRayPunch = xrHelpers.dirRayRpunch) : null

        //wrist
        xrhand.controller.children[0].add(stdRay.clone())

        //direction
        xrhand.controller.children[10].add(dirRayFwd.clone())
        xrhand.controller.children[10].add(dirRayDwn.clone())

        //punch
        xrhand.controller.children[11].add(dirRayPunch.clone())

        //tips
        for (let i = 0; i < tip.length; i++) {
            let coords: Group = xrHelpers.getCoordsHelper()
            coords.scale.set(coordsScale, coordsScale, coordsScale)
            xrhand.controller.children[tip[i]].add(tipRay.clone())
            xrhand.controller.children[tip[i]].add(coords)
        }

        //joints
        for (let i = 0; i < joints.length; i++) {
            let coords: Group = xrHelpers.getCoordsHelper()
            coords.scale.set(coordsScale, coordsScale, coordsScale)
            xrhand.controller.children[joints[i]].add(stdRay.clone())
            xrhand.controller.children[joints[i]].add(coords)
        }
    }

    // ---- VR Hit Test ----

    let currentScene: Scene
    $: $svelthreeStores[sti].currentSceneIndex ? updateCurrentScene() : null

    function updateCurrentScene(): void {
        currentScene = $svelthreeStores[sti].scenes[$svelthreeStores[sti].currentSceneIndex - 1].scene
    }

    let tempMatrix: Matrix4 = new Matrix4()

    let rayLineGeom = new BufferGeometry().setFromPoints([new Vector3(0, 0, 0), new Vector3(0, 0, -1)])
    let rayLineMat = new LineDashedMaterial({
        color: 0x9ae6b4,
        linewidth: 1,
        scale: 1,
        dashSize: 0.01,
        gapSize: 0.01
    })
    let rayLine = new Line(rayLineGeom)
    rayLine.material = rayLineMat
    rayLine.name = "rayline"
    rayLine.scale.z = 5

    function performVirtualHitTest(controller: Group): void {
        console.warn("SessionVR performVirtualHitTest!")

        if (input === "controller") {
            tempMatrix.identity().extractRotation(controller.matrixWorld)

            $svelthreeStores[sti].raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld)

            $svelthreeStores[sti].raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix)

            let toTest = currentScene.children.filter((child: Object3D) => child.type === "Mesh")

            $svelthreeStores[sti].allIntersections = $svelthreeStores[sti].raycaster.intersectObjects(toTest, true)

            let currentHitsTotal = $svelthreeStores[sti].allIntersections.length
            console.warn("current hits total: ", currentHitsTotal, $svelthreeStores[sti].allIntersections)
        }

        if (input === "hand") {
            /*
            $svelthreeStores[sti].allIntersections = xrHandHitTester.test(
                controller,
                currentScene,
                $svelthreeStores[sti].raycaster
            )

            let currentHitsTotal = $svelthreeStores[sti].allIntersections.length
            console.warn(
                "current hits total: ",
                currentHitsTotal,
                $svelthreeStores[sti].allIntersections
            )
            */
        }
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
