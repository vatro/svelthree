<script lang="typescript">
    /**
     * @author Vatroslav Vrbanic @see https://github.com/vatro
     */

    import { onMount } from "svelte"
    import { svelthreeStores } from "../stores.js"
    import {
        WebGLRenderer,
        Camera,
        Scene,
        Raycaster,
        Vector2,
        Vector3,
        OrbitControls
    } from "svelthree-three"

    export let w: number
    export let h: number

    export let style: string = undefined
    let clazz: string = undefined
    export { clazz as class }

    interface StoreBody {
        id: number
        canvas: StoreCanvas
        scenes: Scene[]
        cameras: Camera[]
        activeCamera: Camera
        renderer: WebGLRenderer
        raycaster: Raycaster
        allIntersections: []
        pointer: StorePointer
        orbitcontrols: OrbitControls
    }

    interface StoreCanvas {
        dom: HTMLCanvasElement
        dim: { w: number; h: number }
        interactive: boolean
    }

    interface StorePointer {
        pos: Vector2
        event: PointerEvent
        isOverCanvas: boolean
        unprojected: Vector3
    }

    const svelthreeStoreBody: StoreBody = {
        id: undefined,
        canvas: {
            dom: undefined,
            dim: { w: undefined, h: undefined },
            interactive: false
        },
        scenes: [],
        cameras: [],
        activeCamera: undefined,
        renderer: undefined,
        raycaster: undefined,
        allIntersections: undefined,
        pointer: {
            pos: new Vector2(-1, -1),
            event: undefined,
            isOverCanvas: false,
            unprojected: new Vector3()
        },
        orbitcontrols: undefined
    }

    svelthreeStoreBody.canvas.dim.w = w
    svelthreeStoreBody.canvas.dim.h = h

    let sti: number

    //create new store
    $svelthreeStores = [...$svelthreeStores, svelthreeStoreBody]
    sti = $svelthreeStores.length - 1

    let c: HTMLElement
    $: c ? addCanvasToStore() : null

    function addCanvasToStore(): void {
        $svelthreeStores[sti].canvas.dom === undefined
            ? ($svelthreeStores[sti].canvas.dom = c)
            : null
    }

    export let interactive = false
    let isInteractive = false
    let raycaster: Raycaster

    // reactive create raycaster
    $: isInteractive && !raycaster && c
        ? ((raycaster = new Raycaster()),
          ($svelthreeStores[sti].raycaster = raycaster),
          ($svelthreeStores[sti].canvas.interactive = true),
          startUpdatingPointer(),
          console.info(
              "SVELTHREE > Canvas : after Raycaster creation, $svelthreeStores[sti]: ",
              $svelthreeStores[sti]
          ))
        : null

    // reactive remove raycaster
    $: !isInteractive && raycaster
        ? (($svelthreeStores[sti].canvas.interactive = false),
          ($svelthreeStores[sti].raycaster = undefined),
          (raycaster = null),
          stopUpdatingPointer(),
          console.info(
              "SVELTHREE > Canvas : after Raycaster remove, $svelthreeStores[sti]: ",
              $svelthreeStores[sti]
          ))
        : null

    let didMount: boolean

    $: didMount ? (isInteractive = interactive) : null

    function startUpdatingPointer(): void {
        window.addEventListener("pointermove", updatePointer, false)
    }

    function updatePointer(e: PointerEvent): void {
        let rect: ClientRect = c.getBoundingClientRect()

        $svelthreeStores[sti].pointer.pos.x =
            ((e.clientX - rect.left) / (rect.right - rect.left)) * 2 - 1
        $svelthreeStores[sti].pointer.pos.y =
            -((e.clientY - rect.top) / (rect.bottom - rect.top)) * 2 + 1

        e.clientX > rect.left &&
        e.clientX < rect.right &&
        e.clientY > rect.top &&
        e.clientY < rect.bottom
            ? ($svelthreeStores[sti].pointer.isOverCanvas = true)
            : ($svelthreeStores[sti].pointer.isOverCanvas = false)

        // calculate unprojected Point
        // see https://stackoverflow.com/questions/13055214/mouse-canvas-x-y-to-three-js-world-x-y-z
        let v: Vector3 = new Vector3(
            $svelthreeStores[sti].pointer.pos.x,
            $svelthreeStores[sti].pointer.pos.y,
            0.5
        )
        let t: Vector3 = new Vector3()
        v.unproject($svelthreeStores[sti].activeCamera)
        v.sub($svelthreeStores[sti].activeCamera.position).normalize()
        let d = -$svelthreeStores[sti].activeCamera.position.z / v.z
        t.copy($svelthreeStores[sti].activeCamera.position).add(
            v.multiplyScalar(d)
        )
        $svelthreeStores[sti].pointer.unprojected.copy(t)

        /**
         *  IMPORTANT: we save this event in SvelthreeInteraction.svelte for construction of:
         *  'pointerenter', 'pointerover', 'pointerout', 'pointerleave' & 'pointermove'
         */
        $svelthreeStores[sti].pointer.event = e
    }

    function stopUpdatingPointer(): void {
        window.removeEventListener("pointermove", updatePointer)
    }

    onMount(() => {
        didMount = true
        console.info(
            "SVELTHREE > onMount : Canvas, $svelthreeStores[sti]: ",
            $svelthreeStores[sti]
        )

        return () => {
            console.info("SVELTHREE > onDestroy : Canvas")
            stopUpdatingPointer()
        }
    })

    /**
     * Public methods
     */

    export function getCanvas(): HTMLCanvasElement {
        return $svelthreeStores[sti].canvas.dom
    }

    export function getDimensions(): { w: number; h: number } {
        return {
            w: $svelthreeStores[sti].canvas.dom.width,
            h: $svelthreeStores[sti].canvas.dom.height
        }
    }

    export function doResize(w: number, h: number) {
        $svelthreeStores[sti].canvas.dim = { w: w, h: h }
    }
</script>

<canvas bind:this={c} width={w} height={h} {style} class={clazz}>
    <slot {sti} />
</canvas>
