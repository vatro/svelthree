<script lang="typescript">
    /**
     * @author Vatroslav Vrbanic @see https://github.com/vatro
     */

    import { svelthreeStores } from "../stores.js"
    import { onMount } from "svelte"
    import { Vector3, Raycaster, Object3D } from "svelthree-three"

    export let interactionEnabled: boolean
    export let parent: SvelteComponent
    export let sti: number
    export let obj: Object3D
    //export let recursive: boolean

    let raycaster: Raycaster
    $: $svelthreeStores[sti].raycaster
        ? (raycaster = $svelthreeStores[sti].raycaster)
        : null

    export let dispatch: (type: string, detail?: any) => void

    /**
     * Canvas-DOM-Element listens to 'pointermove' the whole time in order to trigger over/out enter/leave events
     */
    let c: HTMLElement
    $: $svelthreeStores[sti].canvas.dom
        ? (c = $svelthreeStores[sti].canvas.dom)
        : null

    $: if (c) {
        if (interactionEnabled && obj && !obj.userData.interact) {
            addListeners()
            obj.userData.interact = true
        } else if (!interactionEnabled && obj && obj.userData.interact) {
            removeListeners()
            obj.userData.interact = false
        }
    }

    // Use single pointermove from canvas via store
    let lastPointerMoveEvent: PointerEvent

    $: if (interactionEnabled) {
        if (obj && raycaster) {
            if ($svelthreeStores[sti].pointer.event !== lastPointerMoveEvent) {
                lastPointerMoveEvent = $svelthreeStores[sti].pointer.event
                checkOverOut(lastPointerMoveEvent)
                tryDispatch(lastPointerMoveEvent)
            }
        }
    } else if (obj && obj.userData.interact) {
        obj.userData.interact = false
        removeListeners()
    }

    function addListeners() {
        c.addEventListener("click", tryDispatch, false)
        c.addEventListener("pointerup", tryDispatch, false)
        c.addEventListener("pointerdown", tryDispatch, false)
    }

    function removeListeners() {
        c.removeEventListener("click", tryDispatch)
        c.removeEventListener("pointerup", tryDispatch)
        c.removeEventListener("pointerdown", tryDispatch)
    }

    let checks = {
        click: { check: dispatchOnIntersect },
        pointerup: { check: dispatchOnIntersect },
        pointerdown: { check: dispatchOnIntersect },
        pointermove: { check: dispatchAlways }
    }

    function tryDispatch(e: MouseEvent | PointerEvent): void {
        if (checks.hasOwnProperty(e.type)) {
            checks[e.type].check(e)
        }
    }

    onMount(() => {
        console.info("SVELTHREE > onMount : SvelthreeInteraction")

        return () => {
            console.info("SVELTHREE > onDestroy : SvelthreeInteraction")
            obj.userData.interact = false

            if (c) {
                c.removeEventListener("pointermove", checkOverOut)
                c.removeEventListener("click", tryDispatch)
                c.removeEventListener("pointerup", tryDispatch)
                c.removeEventListener("pointerdown", tryDispatch)
                c.removeEventListener("pointermove", tryDispatch)
            }
        }
    })

    let isOverDispatched = false
    let isOutDispatched = true

    let raycasterData: {}

    function getPointerData(e: PointerEvent | MouseEvent) {
        let pointerData = {
            // PointerEventInit props, see https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent/PointerEvent

            pointerId: 1976 + e["pointerId"],
            width: e["width"],
            height: e["height"],
            pressure: e["pressure"],
            tangentialPressure: e["tangentialPressure"],
            tiltX: e["tangentialPressure"],
            tiltY: e["tiltY"],
            twist: e["twist"],
            pointerType: e["pointerType"],
            isPrimary: e["isPrimary"],

            // without PointerEvent methods

            // MouseEvent props, see https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent
            altKey: e.altKey,
            button: e.button,
            buttons: e.buttons,
            clientX: e.clientX,
            clientY: e.clientY,
            ctrlKey: e.ctrlKey,
            metaKey: e.metaKey,
            movementX: e.movementX,
            movementY: e.movementY,
            offsetX: e.offsetX,
            offsetY: e.offsetY,
            pageX: e.pageX,
            pageY: e.pageY,
            //region: e.region, // doesn't exist on Mouse or PointerEvent, deprecated?
            relatedTarget: e.relatedTarget,
            screenX: e.screenX,
            screenY: e.screenY,
            shiftKey: e.shiftKey,
            //which // not standardized
            //mozPressure // deprecated
            //mozInputSource // not standardized
            //webkitForce // not standardized
            x: e.x, // = clientX
            y: e.y // = clientY

            // without MouseEvent methods
        }

        return pointerData
    }

    /**
     * The checkOverOut could maybe also be further optimized to bypass raycaster check one level higher?
     * Although we already get very decent performance with high number of interactive objects, the problem is
     * this check happens on every pointermove event in every interactive object. Not sure if some distance calculation
     * based on e.g. the bounding box of the mesh would be more performant than simply checking "allIntersections" in
     * store like we do at the moment. hmm...
     */
    function checkOverOut(e: PointerEvent) {
        if (intersects()) {
            if (!isOverDispatched) {
                let pointerData = getPointerData(e)

                mDispatch(
                    "pointerenter",
                    {
                        type: "pointerenter",
                        target: obj,
                        pointerData: pointerData,
                        raycasterData: raycasterData
                    },
                    !!parent.onPointerEnter
                )
                mDispatch(
                    "pointerover",
                    {
                        type: "pointerover",
                        target: obj,
                        pointerData: pointerData,
                        raycasterData: raycasterData
                    },
                    !!parent.onPointerOver
                )
                isOverDispatched = true
                isOutDispatched = false
            }
        } else {
            if (!isOutDispatched) {
                let pointerData = getPointerData(e)

                mDispatch(
                    "pointerout",
                    {
                        type: "pointerout",
                        target: obj,
                        pointerData: pointerData,
                        raycasterData: raycasterData
                    },
                    !!parent.onPointerOut
                )
                mDispatch(
                    "pointerleave",
                    {
                        type: "pointerleave",
                        target: obj,
                        pointerData: pointerData,
                        raycasterData: raycasterData
                    },
                    !!parent.onPointerLeave
                )
                isOutDispatched = true
                isOverDispatched = false
            }
        }
    }

    /**
     * Proccess 'pointermove'-event only if parent component has been rendered with an on:click handler
     * or if an internal 'onPointerMove'-handler was provided.
     * @see https://discord.com/channels/457912077277855764/457912077277855766/728789428729938021
     * @see https://svelte.dev/repl/b7d49058463c48cbb1b35cbbe19c184d?version=3.24.0
     */

    function dispatchAlways(e: PointerEvent) {
        Object.keys(parent.$$.callbacks).includes("pointermove")
            ? dispatch(e.type, {
                  event: e,
                  target: obj,
                  unprojected: $svelthreeStores[sti].pointer.unprojected
              })
            : null

        parent.onPointerMove
            ? onPointerMoveAction(
                  new CustomEvent(e.type, {
                      detail: {
                          event: e,
                          target: obj,
                          unprojected: $svelthreeStores[sti].pointer.unprojected
                      }
                  })
              )
            : null
    }

    function dispatchOnIntersect(e: MouseEvent | PointerEvent) {
        if (intersects()) {
            e.type === "click" ? doDispatch(e, !!parent.onClick) : null
            e.type === "pointerup" ? doDispatch(e, !!parent.onPointerUp) : null
            e.type === "pointerdown"
                ? doDispatch(e, !!parent.onPointerDown)
                : null
        }
    }

    function doDispatch(
        e: MouseEvent | PointerEvent,
        fireInternal: boolean
    ): void {
        let pointerData = getPointerData(e)
        mDispatch(
            e.type,
            {
                type: e.type,
                target: obj,
                pointerData: pointerData,
                raycasterData: raycasterData
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
                case "click":
                    parent.onClick ? onClickAction(event) : null
                    break
                case "pointerup":
                    parent.onPointerUp ? onPointerUpAction(event) : null
                    break
                case "pointerdown":
                    parent.onPointerDown ? onPointerDownAction(event) : null
                    break
                case "pointerover":
                    parent.onPointerOver ? onPointerOverAction(event) : null
                    break
                case "pointerout":
                    parent.onPointerOut ? onPointerOutAction(event) : null
                    break
                case "pointerenter":
                    parent.onPointerOut ? onPointerEnterAction(event) : null
                    break
                case "pointerleave":
                    parent.onPointerLeave ? onPointerLeaveAction(event) : null
                    break
                case "pointermove": // see dispatchAlways(e: PointerEvent)
                    break
            }
        }
    }

    /**
     * @see https://threejs.org/docs/#api/en/core/Raycaster
     */

    function intersects(): boolean {
        if ($svelthreeStores[sti].allIntersections) {
            if (
                $svelthreeStores[sti].allIntersections.length > 0 &&
                $svelthreeStores[sti].allIntersections[0].object === obj
            ) {
                let intersects = raycaster.intersectObject(obj)

                raycasterData = {
                    intersections: intersects, // [] all intersections
                    ray: raycaster.ray, // Ray( origin : Vector3, direction : Vector3 )
                    camera: raycaster.camera,
                    unprojectedPoint: new Vector3(
                        $svelthreeStores[sti].pointer.pos.x,
                        $svelthreeStores[sti].pointer.pos.y,
                        0
                    ).unproject(raycaster.camera)
                }

                return true
            } else {
                return false
            }
        } else {
            return false
        }
    }

    // --- Internal Actions ---

    function onClickAction(e: CustomEvent): void {
        console.info(
            "SVELTHREE > SvelthreeInteraction :internal onClickAction!"
        )
        typeof parent.onClick === "function"
            ? parent.onClick(e)
            : console.error(
                  "SVELTHREE > SvelthreeInteraction : provided 'onClick' object is not a valid function!"
              )
    }

    function onPointerUpAction(e: CustomEvent): void {
        console.info(
            "SVELTHREE > SvelthreeInteraction : internal onPointerUpAction!"
        )
        typeof parent.onPointerUp === "function"
            ? parent.onPointerUp(e)
            : console.error(
                  "SVELTHREE > SvelthreeInteraction : provided 'onPointerUp' object is not a function!"
              )
    }

    function onPointerDownAction(e: CustomEvent): void {
        console.info(
            "SVELTHREE > SvelthreeInteraction : internal onPointerDownAction!"
        )
        typeof parent.onPointerDown === "function"
            ? parent.onPointerDown(e)
            : console.error(
                  "SVELTHREE > SvelthreeInteraction : provided 'onPointerDown' object is not a function!"
              )
    }

    function onPointerOverAction(e: CustomEvent): void {
        console.info(
            "SVELTHREE > SvelthreeInteraction : internal onPointerOverAction!",
            e
        )
        typeof parent.onPointerOver === "function"
            ? parent.onPointerOver(e)
            : console.error(
                  "SVELTHREE > SvelthreeInteraction : provided 'onPointerOver' object is not a function!"
              )
    }

    function onPointerOutAction(e: CustomEvent): void {
        console.info(
            "SVELTHREE > SvelthreeInteraction : internal onPointerOutAction!",
            e
        )
        typeof parent.onPointerOut === "function"
            ? parent.onPointerOut(e)
            : console.error(
                  "SVELTHREE > SvelthreeInteraction : provided 'onPointerOut' object is not a function!"
              )
    }

    function onPointerEnterAction(e: CustomEvent): void {
        console.info(
            "SVELTHREE > SvelthreeInteraction : internal onPointerEnterAction!",
            e
        )
        typeof parent.onPointerEnter === "function"
            ? parent.onPointerEnter(e)
            : console.error(
                  "SVELTHREE > SvelthreeInteraction : provided 'onPointerEnter' object is not a function!"
              )
    }

    function onPointerLeaveAction(e: CustomEvent): void {
        console.info(
            "SVELTHREE > SvelthreeInteraction : internal onPointerLeaveAction!",
            e
        )
        typeof parent.onPointerLeave === "function"
            ? parent.onPointerLeave(e)
            : console.error(
                  "SVELTHREE > SvelthreeInteraction : provided 'onPointerLeave' object is not a function!"
              )
    }

    function onPointerMoveAction(e: CustomEvent): void {
        console.info(
            "SVELTHREE > SvelthreeInteraction : internal onPointerMoveAction!"
        )
        typeof parent.onPointerMove === "function"
            ? parent.onPointerMove(e)
            : console.error(
                  "SVELTHREE > SvelthreeInteraction : provided 'onPointerMove' object is not a function!"
              )
    }
</script>
