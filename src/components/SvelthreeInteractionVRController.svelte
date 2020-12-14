<script lang="typescript">
    /**
     * @author Vatroslav Vrbanic @see https://github.com/vatro
     */

    import { svelthreeStores } from "../stores.js"
    import { onMount } from "svelte"

    import { Object3D, WebXRController } from "svelthree-three"
    import { SvelteComponentDev } from "svelte/internal"
    import XRDefaults from "../defaults/XRDefaults.js"

    export let interactionEnabled: boolean
    export let parent: SvelteComponentDev
    export let sti: number
    export let obj: Object3D

    export let dispatch: (type: string, detail?: any) => void

    let controllersTotal: number = undefined
    $: $svelthreeStores[sti].renderer.xr.getControllers().length > 0
        ? (controllersTotal = $svelthreeStores[sti].renderer.xr.getControllers().length)
        : null

    $: if (controllersTotal) {
        if (interactionEnabled && obj && !obj.userData.interact) {
            //requestAnimationFrame(() => addListeners())

            //debugger
            addListeners()
            obj.userData.interact = true
        } else if (!interactionEnabled && obj && obj.userData.interact) {
            removeListeners()
            obj.userData.interact = false
        }
    }

    function addListeners() {
        for (let i = 0; i < $svelthreeStores[sti].renderer.xr.getControllers().length; i++) {
            // WHY?  this doesn't work! returns new Group with controller.getTargetRaySpace()
            //let controller: WebXRController = $svelthreeStores[sti].xr.controllers[i]

            /*
            let controller2: WebXRController = $svelthreeStores[sti].renderer.xr.getControllers[i]

            const targetRaySpace1: Group = controller.getTargetRaySpace()
            const targetRaySpace2: Group = controller2.getTargetRaySpace()

            console.log(targetRaySpace1 === targetRaySpace2) // true

            const targetRaySpace: Group = controller.getTargetRaySpace()

            console.log(targetRaySpace1 === targetRaySpace) // true

            debugger
            */

            const targetRaySpace: Group = $svelthreeStores[sti].renderer.xr.getController(i)

            // WHY?  this doesn't work! returns new Group!
            //const targetRaySpace: Group = controller.getTargetRaySpace()

            targetRaySpace.addEventListener("select", tryDispatch)
            targetRaySpace.addEventListener("selectstart", tryDispatch)
            targetRaySpace.addEventListener("selectend", tryDispatch)
            targetRaySpace.addEventListener("squeeze", tryDispatch)
            targetRaySpace.addEventListener("squeezestart", tryDispatch)
            targetRaySpace.addEventListener("squeezeend", tryDispatch)

            // wleche uuid hat die gruppe und welche listener? vergleiche mit vrinteraction
            // debugger

            const gripSpace: Group = $svelthreeStores[sti].renderer.xr.getControllerGrip(i)

            // this doesn't work! returns new Group!
            //const gripSpace: Group = controller.getGripSpace()

            gripSpace.addEventListener("select", tryDispatch)
            gripSpace.addEventListener("selectstart", tryDispatch)
            gripSpace.addEventListener("selectend", tryDispatch)
            gripSpace.addEventListener("squeeze", tryDispatch)
            gripSpace.addEventListener("squeezestart", tryDispatch)
            gripSpace.addEventListener("squeezeend", tryDispatch)

            // wleche uuid hat die gruppe und welche listener? vergleiche mit vrinteraction
            //debugger
        }
    }

    function removeListeners() {
        for (let i = 0; i < $svelthreeStores[sti].renderer.xr.getControllers().length; i++) {
            // WHY?  this doesn't work! returns new Group with controller.getTargetRaySpace()
            //let controller = $svelthreeStores[sti].xr.controllers[i]

            const targetRaySpace: Group = $svelthreeStores[sti].renderer.xr.getController(i)

            // WHY?  this doesn't work! returns new Group!
            // const targetRaySpace: Group = controller.getTargetRaySpace()

            targetRaySpace.removeEventListener("select", tryDispatch)
            targetRaySpace.removeEventListener("selectstart", tryDispatch)
            targetRaySpace.removeEventListener("selectend", tryDispatch)
            targetRaySpace.removeEventListener("squeeze", tryDispatch)
            targetRaySpace.removeEventListener("squeezestart", tryDispatch)
            targetRaySpace.removeEventListener("squeezeend", tryDispatch)

            const gripSpace: Group = $svelthreeStores[sti].renderer.xr.getControllerGrip(i)

            // WHY?  this doesn't work! returns new Group!
            //const gripSpace: Group = controller.getGripSpace()

            gripSpace.removeEventListener("select", tryDispatch)
            gripSpace.removeEventListener("selectstart", tryDispatch)
            gripSpace.removeEventListener("selectend", tryDispatch)
            gripSpace.removeEventListener("squeeze", tryDispatch)
            gripSpace.removeEventListener("squeezestart", tryDispatch)
            gripSpace.removeEventListener("squeezeend", tryDispatch)
        }
    }

    let checks = {
        select: { check: dispatchOnIntersect },
        selectstart: { check: dispatchOnIntersect },
        selectend: { check: dispatchOnIntersect },
        squeeze: { check: dispatchOnIntersect },
        squeezestart: { check: dispatchOnIntersect },
        squeezeend: { check: dispatchOnIntersect }
    }

    //TODO: Event Type should be XRInputSourceEvent, but it isn't, because WebXRManager event propagation
    //function tryDispatch(e:XRInputSourceEvent): void {
    //e : {type, target}
    function tryDispatch(e): void {
        if (checks.hasOwnProperty(e.type)) {
            checks[e.type].check(e)
        }
    }

    onMount(() => {
        console.info("SVELTHREE > onMount : SvelthreeInteractionVRController")

        return () => {
            console.info("SVELTHREE > onDestroy : SvelthreeInteractionVRController")
            obj.userData.interact = false
            if ($svelthreeStores[sti].renderer && $svelthreeStores[sti].renderer.xr) {
                removeListeners()
            }
        }
    })

    let intersects: boolean = false

    //TODO: Event Type should be XRInputSourceEvent, but it isn't, because WebXRManager event propagation
    //function dispatchOnIntersect(e:XRInputSourceEvent): void {
    //e : {type, target}
    function dispatchOnIntersect(e) {
        const eventType: XRControllerEventType = e.type

        console.log(eventType)

        //debugger

        if (checkIntersect(e.target.userData.intersections)) {
            e.type === "select" ? doDispatch(e, !!parent.onSelect) : null
            e.type === "selectstart" ? doDispatch(e, !!parent.onSelectStart) : null
            e.type === "selectend" ? doDispatch(e, !!parent.onSelectEnd) : null
            e.type === "squeeze" ? doDispatch(e, !!parent.onSqueeze) : null
            e.type === "squeezestart" ? doDispatch(e, !!parent.onSqueezeEnd) : null
            e.type === "squeezeend" ? doDispatch(e, !!parent.onSqueezeEnd) : null
        }
    }

    // TODO  Event Type should be XRInputSourceEvent, but it isn't, because WebXRManager event propagation
    //function doDispatch(e: XRInputSourceEvent, fireInternal: boolean): void {
    //e : {type, target}
    function doDispatch(e: XRControllerSpaceEvent, fireInternal: boolean): void {
        const message: XRControllerEventType = e.type

        const detail: XRControllerEventDetailObj = {
            //type: e.type,
            xrInputSource: e.target.userData.xrInputSource, // XRInputSource
            controllerSpace: e.target,
            controllerSpaceType: e.target.userData.spaceType,
            //obj: obj,
            controllerHandedness: e.target.userData.xrInputSource.handedness,
            targetObj: obj
            //frame: e.frame,
            //inputSource: e.inputSource
        }

        const target: Object3D = obj

        mDispatch(message, detail, fireInternal)
    }

    // TODO  Type details!
    function mDispatch(
        message: XRControllerEventType,
        detail: XRControllerEventDetailObj,
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
        if ($svelthreeStores[sti].xr.hitTestMode === XRDefaults.HITTEST_MODE_VIRTUAL && intersections) {
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
        console.info("SVELTHREE > SvelthreeInteractionVRController :internal onSelectAction!")
        typeof parent.onSelect === "function"
            ? parent.onSelect(e)
            : console.error(
                  "SVELTHREE > SvelthreeInteractionVRController : provided 'onSelect' object is not a valid function!"
              )
    }

    function onSelectStartAction(e: CustomEvent): void {
        console.info("SVELTHREE > SvelthreeInteractionVRController :internal onSelectStartAction!")
        typeof parent.onSelectStart === "function"
            ? parent.onSelectStart(e)
            : console.error(
                  "SVELTHREE > SvelthreeInteractionVRController : provided 'onSelectStart' object is not a valid function!"
              )
    }

    function onSelectEndAction(e: CustomEvent): void {
        console.info("SVELTHREE > SvelthreeInteractionVRController :internal onSelectEndAction!")
        typeof parent.onSelectEnd === "function"
            ? parent.onSelectEnd(e)
            : console.error(
                  "SVELTHREE > SvelthreeInteractionVRController : provided 'onSelectEnd' object is not a valid function!"
              )
    }

    // VR
    function onSqueezeAction(e: CustomEvent): void {
        console.info("SVELTHREE > SvelthreeInteractionVRController :internal onSqueezeAction!")
        typeof parent.onSqueeze === "function"
            ? parent.onSqueeze(e)
            : console.error(
                  "SVELTHREE > SvelthreeInteractionVRController : provided 'onSqueeze' object is not a valid function!"
              )
    }

    function onSqueezeStartAction(e: CustomEvent): void {
        console.info("SVELTHREE > SvelthreeInteractionVRController :internal onSqueezeStartAction!")
        typeof parent.onSqueezeStart === "function"
            ? parent.onSqueezeStart(e)
            : console.error(
                  "SVELTHREE > SvelthreeInteractionVRController : provided 'onSqueezeStart' object is not a valid function!"
              )
    }

    function onSqueezeEndAction(e: CustomEvent): void {
        console.info("SVELTHREE > SvelthreeInteractionVRController :internal onSqueezeEndAction!")
        typeof parent.onSqueezeEnd === "function"
            ? parent.onSqueezeEnd(e)
            : console.error(
                  "SVELTHREE > SvelthreeInteractionVRController : provided 'onSqueezeEnd' object is not a valid function!"
              )
    }
</script>
