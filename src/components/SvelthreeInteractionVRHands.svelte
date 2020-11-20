<script lang="typescript">
    /**
     * @author Vatroslav Vrbanic @see https://github.com/vatro
     */

    import { svelthreeStores } from "../stores.js"
    import { onMount } from "svelte"
    import { Object3D, Group } from "svelthree-three"
    import { SvelteComponentDev } from "svelte/internal"

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
    $: $svelthreeStores[sti].xr.controllers.length > 0
        ? (controllersTotal = $svelthreeStores[sti].xr.controllers.length)
        : null

    $: if (controllersTotal) {
        if (interactionEnabled && obj && !obj.userData.interact) {
            //requestAnimationFrame(() => addListeners())
            addListeners()
            obj.userData.interact = true
        } else if (!interactionEnabled && obj && obj.userData.interact) {
            removeListeners()
            obj.userData.interact = false
        }
    }

    //TODO: type hand
    function addListeners() {

        for (let i = 0; i < $svelthreeStores[sti].xr.controllers.length; i++) {
            let hand = $svelthreeStores[sti].renderer.xr.getHand(i)
            if(pinchRemote || pinchTouch || pinchHybrid) {
                hand.addEventListener("pinchstart", tryDispatch)
                hand.addEventListener("pinchend", tryDispatch)
            }

            if(xrHandTouch) {
                hand.addEventListener("touch", onXrHandTouch)
            }
        }
    }

    function onXrHandTouch(e) {

    }

    function removeListeners() {
        for (let i = 0; i < $svelthreeStores[sti].xr.controllers.length; i++) {
            let hand = $svelthreeStores[sti].renderer.xr.getHand(i)
            //hands
            hand.removeEventListener("pinchstart", tryDispatch)
            hand.removeEventListener("pinchend", tryDispatch)
            hand.removeEventListener("touch", onTouch)
        }
    }

    let checks = {
        pinchstart: { check: differPinch },
        pinchend: { check: differPinch }
    }

    //TODO: Event Type should be XRInputSourceEvent, but it isn't, because WebXRManager event propagation
    //function tryDispatch(e:XRInputSourceEvent): void {
    //e : {type, target}
    function tryDispatch(e): void {
        if (checks.hasOwnProperty(e.type)) {
            checks[e.type].check(e)
        }
    }

    function differPinch(e): void {
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

    function tryDispatchRemotePinch(e) {
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

    function tryDispatchTouchPinch(e) {
        let pinchEvent = e

        let pinchDistanceLimit = e.target.userData.pinchRayLength + 0.01 // DEFAULT
        e.target.userData.pinchConfig.distance.touch ? pinchDistanceLimit = e.target.userData.pinchRayLength + e.target.userData.pinchConfig.distance.touch : null

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

    function tryDispatchHybridPinch(e) {
        let pinchEvent = e

        let pinchDistanceLimit = e.target.userData.pinchRayLength + 0.01 // DEFAULT
        e.target.userData.pinchConfig.distance.touch ? pinchDistanceLimit = e.target.userData.pinchRayLength + e.target.userData.pinchConfig.distance.touch : null
       
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
        console.info("SVELTHREE > onMount : SvelthreeInteractionVRHands")

        return () => {
            console.info("SVELTHREE > onDestroy : SvelthreeInteractionVRHands")
            obj.userData.interact = false
            removeListeners()
        }
    })

    let intersects: boolean = false

    //TODO: Event Type should be XRInputSourceEvent, but it isn't, because WebXRManager event propagation
    //function dispatchOnIntersect(e:XRInputSourceEvent): void {
    //e : {type, target}
    function dispatchOnIntersect(e) {
        if (checkIntersect()) {
            /*
            e.type === "select" ? doDispatch(e, !!parent.onSelect) : null
            e.type === "selectstart"
                ? doDispatch(e, !!parent.onSelectStart)
                : null
            e.type === "selectend" ? doDispatch(e, !!parent.onSelectEnd) : null
            e.type === "squeeze" ? doDispatch(e, !!parent.onSqueeze) : null
            e.type === "squeezestart"
                ? doDispatch(e, !!parent.onSqueezeEnd)
                : null
            e.type === "squeezeend"
                ? doDispatch(e, !!parent.onSqueezeEnd)
                : null
                */
        }
    }

    function dispatchAlways(e) {
        //hands
        e.type === "pinchstart" ? doDispatch(e, !!parent.onPinchStart) : null

        e.type === "pinchend" ? doDispatch(e, !!parent.onPinchEnd) : null
    }

    //TODO: Event Type should be XRInputSourceEvent, but it isn't, because WebXRManager event propagation
    //function doDispatch(e: XRInputSourceEvent, fireInternal: boolean): void {
    //e : {type, target}
    function doDispatch(e, fireInternal: boolean): void {
        mDispatch(
            e.type,
            {
                type: e.type,
                obj: obj,
                target: e.target,
                handedness: e.handedness // TODO : examine: wehen using controller-mode 'handedness' is not a first level property
                //frame: e.frame,
                //inputSource: e.inputSource
            },
            fireInternal
        )
    }

    function mDispatch(
        message: string,
        details: { [key: string]: any },
        fireInternal: boolean
    ): void {
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
                    parent.onPinchRemoteStart
                        ? onPinchRemoteStartAction(event)
                        : null
                    break
                case "pinchremoteeend":
                    parent.onPinchEnd ? onPinchRemoteEndAction(event) : null
                    break
                case "pinchtouchstart":
                    parent.onPinchTouchStart
                        ? onPinchTouchStartAction(event)
                        : null
                    break
                case "pinchtouchend":
                    parent.onPinchTouchEnd ? onPinchTouchEndAction(event) : null
                    break
                default:
                    break
            }
        }
    }

    function checkIntersect(): boolean {
        if (
            $svelthreeStores[sti].xr.hitTestMode === "virtual" &&
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

    function onPinchStartAction(e: CustomEvent): void {
        console.info(
            "SVELTHREE > SvelthreeInteractionVRHands :internal onPinchStartAction!"
        )
        typeof parent.onPinchStart === "function"
            ? parent.onPinchStart(e)
            : console.error(
                  "SVELTHREE > SvelthreeInteractionVRHands : provided 'onPinchStart' object is not a valid function!"
              )
    }

    function onPinchEndAction(e: CustomEvent): void {
        console.info(
            "SVELTHREE > SvelthreeInteractionVRHands :internal onPinchEndAction!"
        )
        typeof parent.onPinchEnd === "function"
            ? parent.onPinchEnd(e)
            : console.error(
                  "SVELTHREE > SvelthreeInteractionVRHands : provided 'onPinchEnd' object is not a valid function!"
              )
    }

    function onPinchRemoteStartAction(e: CustomEvent): void {
        console.info(
            "SVELTHREE > SvelthreeInteractionVRHands :internal onPinchRemoteStartAction!"
        )
        typeof parent.onPinchRemoteStart === "function"
            ? parent.onPinchRemoteStart(e)
            : console.error(
                  "SVELTHREE > SvelthreeInteractionVRHands : provided 'onPinchRemoteStart' object is not a valid function!"
              )
    }

    function onPinchRemoteEndAction(e: CustomEvent): void {
        console.info(
            "SVELTHREE > SvelthreeInteractionVRHands :internal onPinchRemoteEndAction!"
        )
        typeof parent.onPinchRemoteEnd === "function"
            ? parent.onPinchRemoteEnd(e)
            : console.error(
                  "SVELTHREE > SvelthreeInteractionVRHands : provided 'onPinchRemoteEnd' object is not a valid function!"
              )
    }

    function onPinchTouchStartAction(e: CustomEvent): void {
        console.info(
            "SVELTHREE > SvelthreeInteractionVRHands :internal onPinchTouchStartAction!"
        )
        typeof parent.onPinchTouchStart === "function"
            ? parent.onPinchTouchStart(e)
            : console.error(
                  "SVELTHREE > SvelthreeInteractionVRHands : provided 'onPinchTouchStart' object is not a valid function!"
              )
    }

    function onPinchTouchEndAction(e: CustomEvent): void {
        console.info(
            "SVELTHREE > SvelthreeInteractionVRHands :internal onPinchTouchEndAction!"
        )
        typeof parent.onPinchTouchEnd === "function"
            ? parent.onPinchTouchEnd(e)
            : console.error(
                  "SVELTHREE > SvelthreeInteractionVRHands : provided 'onPinchTouchEnd' object is not a valid function!"
              )
    }

    function onCustomTouchEventAction(e: CustomEvent): void {
        console.info(
            "SVELTHREE > SvelthreeInteractionVRHands :internal onCustomTouchEventAction!"
        )
        typeof parent.onCustomTouchEvent === "function"
            ? parent.onCustomTouchEvent(e)
            : console.error(
                  "SVELTHREE > SvelthreeInteractionVRHands : provided 'onCustomTouchEvent' object is not a valid function!"
              )
    }
</script>
