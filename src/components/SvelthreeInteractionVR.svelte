<script lang="ts">
    /**
     * @author Vatroslav Vrbanic @see https://github.com/vatro
     */

    import { svelthreeStores } from "../stores.js"
    import { onMount } from "svelte"
    import { Object3D } from "svelthree-three"
    import { SvelteComponentDev } from "svelte/internal"

    export let interactionEnabled: boolean
    export let parent: SvelteComponentDev
    export let sti: number
    export let obj: Object3D

    export let dispatch: (type: string, detail?: any) => void

    let controllersTotal: number = undefined
    $: $svelthreeStores[sti].xr.controllers.length > 0
        ? (controllersTotal = $svelthreeStores[sti].xr.controllers.length)
        : null

    $: if (controllersTotal) {
        if (interactionEnabled && obj && !obj.userData.interact) {
            requestAnimationFrame(() => addListeners())
            obj.userData.interact = true
        } else if (!interactionEnabled && obj && obj.userData.interact) {
            removeListeners()
            obj.userData.interact = false
        }
    }

    function addListeners() {
        for (let i = 0; i < $svelthreeStores[sti].xr.controllers.length; i++) {
            let controller = $svelthreeStores[sti].xr.controllers[i]
            controller.addEventListener("select", tryDispatch)
            controller.addEventListener("selectstart", tryDispatch)
            controller.addEventListener("selectend", tryDispatch)
            controller.addEventListener("squeeze", tryDispatch)
            controller.addEventListener("squeezestart", tryDispatch)
            controller.addEventListener("squeezeend", tryDispatch)
        }
    }

    function removeListeners() {
        for (let i = 0; i < $svelthreeStores[sti].xr.controllers.length; i++) {
            let controller = $svelthreeStores[sti].xr.controllers[i]
            controller.removeEventListener("select", tryDispatch)
            controller.removeEventListener("selectstart", tryDispatch)
            controller.removeEventListener("selectend", tryDispatch)
            controller.removeEventListener("squeeze", tryDispatch)
            controller.removeEventListener("squeezestart", tryDispatch)
            controller.removeEventListener("squeezeend", tryDispatch)
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
        console.info("SVELTHREE > onMount : SvelthreeInteractionVR")

        return () => {
            console.info("SVELTHREE > onDestroy : SvelthreeInteractionVR")
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
        }
    }

    //TODO: Event Type should be XRInputSourceEvent, but it isn't, because WebXRManager event propagation
    //function doDispatch(e: XRInputSourceEvent, fireInternal: boolean): void {
    //e : {type, target}
    function doDispatch(e, fireInternal: boolean): void {
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

    function mDispatch(
        message: string,
        details: { [key: string]: any },
        fireInternal: boolean
    ): void {
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

    function onSelectAction(e: CustomEvent): void {
        console.info(
            "SVELTHREE > SvelthreeInteractionVR :internal onSelectAction!"
        )
        typeof parent.onSelect === "function"
            ? parent.onSelect(e)
            : console.error(
                  "SVELTHREE > SvelthreeInteractionVR : provided 'onSelect' object is not a valid function!"
              )
    }

    function onSelectStartAction(e: CustomEvent): void {
        console.info(
            "SVELTHREE > SvelthreeInteractionVR :internal onSelectStartAction!"
        )
        typeof parent.onSelectStart === "function"
            ? parent.onSelectStart(e)
            : console.error(
                  "SVELTHREE > SvelthreeInteractionVR : provided 'onSelectStart' object is not a valid function!"
              )
    }

    function onSelectEndAction(e: CustomEvent): void {
        console.info(
            "SVELTHREE > SvelthreeInteractionVR :internal onSelectEndAction!"
        )
        typeof parent.onSelectEnd === "function"
            ? parent.onSelectEnd(e)
            : console.error(
                  "SVELTHREE > SvelthreeInteractionVR : provided 'onSelectEnd' object is not a valid function!"
              )
    }

    // VR
    function onSqueezeAction(e: CustomEvent): void {
        console.info(
            "SVELTHREE > SvelthreeInteractionVR :internal onSqueezeAction!"
        )
        typeof parent.onSqueeze === "function"
            ? parent.onSqueeze(e)
            : console.error(
                  "SVELTHREE > SvelthreeInteractionVR : provided 'onSqueeze' object is not a valid function!"
              )
    }

    function onSqueezeStartAction(e: CustomEvent): void {
        console.info(
            "SVELTHREE > SvelthreeInteractionVR :internal onSqueezeStartAction!"
        )
        typeof parent.onSqueezeStart === "function"
            ? parent.onSqueezeStart(e)
            : console.error(
                  "SVELTHREE > SvelthreeInteractionVR : provided 'onSqueezeStart' object is not a valid function!"
              )
    }

    function onSqueezeEndAction(e: CustomEvent): void {
        console.info(
            "SVELTHREE > SvelthreeInteractionVR :internal onSqueezeEndAction!"
        )
        typeof parent.onSqueezeEnd === "function"
            ? parent.onSqueezeEnd(e)
            : console.error(
                  "SVELTHREE > SvelthreeInteractionVR : provided 'onSqueezeEnd' object is not a valid function!"
              )
    }
</script>
