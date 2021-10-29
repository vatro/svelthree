<script lang="ts">
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

    export let dispatch: (type: string, detail?: any) => void

    let controller: Group
    $: $svelthreeStores[sti].xr.controller
        ? (controller = $svelthreeStores[sti].xr.controller)
        : null

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

    //TODO: Event Type should be XRInputSourceEvent, but it isn't, because WebXRManager event propagation
    //function tryDispatch(e:XRInputSourceEvent): void {
    //e : {type, target}
    function tryDispatch(e): void {
        if (checks.hasOwnProperty(e.type)) {
            checks[e.type].check(e)
        }
    }

    onMount(() => {
        console.info("SVELTHREE > onMount : SvelthreeInteractionXR")

        return () => {
            console.info("SVELTHREE > onDestroy : SvelthreeInteractionXR")
            obj.userData.interact = false

            if (controller) {
                controller.removeEventListener("select", tryDispatch)
                controller.removeEventListener("selectstart", tryDispatch)
                controller.removeEventListener("selectend", tryDispatch)
            }
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
            "SVELTHREE > SvelthreeInteractionXR :internal onSelectAction!"
        )
        typeof parent.onSelect === "function"
            ? parent.onSelect(e)
            : console.error(
                  "SVELTHREE > SvelthreeInteractionXR : provided 'onSelect' object is not a valid function!"
              )
    }

    function onSelectStartAction(e: CustomEvent): void {
        console.info(
            "SVELTHREE > SvelthreeInteractionXR :internal onSelectStartAction!"
        )
        typeof parent.onSelectStart === "function"
            ? parent.onSelectStart(e)
            : console.error(
                  "SVELTHREE > SvelthreeInteractionXR : provided 'onSelectStart' object is not a valid function!"
              )
    }

    function onSelectEndAction(e: CustomEvent): void {
        console.info(
            "SVELTHREE > SvelthreeInteractionXR :internal onSelectEndAction!"
        )
        typeof parent.onSelectEnd === "function"
            ? parent.onSelectEnd(e)
            : console.error(
                  "SVELTHREE > SvelthreeInteractionXR : provided 'onSelectEnd' object is not a valid function!"
              )
    }
</script>
