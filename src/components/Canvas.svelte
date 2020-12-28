<!-- 
@component
This is a **svelthree** _Canvas_ Component.  
// TODO : Describe in detail.
-->
<script lang="typescript">
    /**
     * @author Vatroslav Vrbanic @see https://github.com/vatro
     */

    import { onMount } from "svelte"
    import { svelthreeStores } from "../stores.js"
    import {
        WebGLRenderer,
        WebXRController,
        Camera,
        Scene,
        Raycaster,
        Vector2,
        Vector3,
        OrbitControls,
        Mesh,
        BufferGeometry
    } from "svelthree-three"

    import type { Intersection } from "svelthree-three"

    //BVH
    import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from "../../node_modules/three-mesh-bvh/src"

    import { SvelteComponentDev } from "svelte/internal"

    export let w: number
    export let h: number

    export let style: string = undefined
    let clazz: string = undefined
    export { clazz as class }

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

    interface SvelthreeXRFrame {
        timestamp: number
        delta: number
        frame: XRFrame
    }

    interface XR {
        sessionMode: string
        //currentVRInputType: SessionVRInputType
        inputConfig: SessionVRInputConfig
        controller: WebXRController // AR
        controllerConfig: XrInputConfigGrippable
        controllers: WebXRController[] //VR
        enablePinch: XrHandPinchConfig
        //handProfile: XrHandProfile
        enableTouch: XrHandTouchConfig
        touchEvents: XrHandTouchEvents
        enableTouchX: XrHandTouchXConfig
        leftHandTouchEnabled: boolean
        leftHandTouchEnabledJoints: number[]
        rightHandTouchEnabled: boolean
        rightHandTouchEnabledJoints: number[]
        leftHandPinchEnabled: boolean
        leftHandPinchConfig: XrHandPinchConfigItem
        rightHandPinchEnabled: boolean
        rightHandPinchConfig: XrHandPinchConfigItem
        requiredFeatures: string[]
        optionalFeatures: string[]
        domOverlay: HTMLDivElement
        hitTestModeInitial: XrHitTestMode
        hitTestMode: XrHitTestMode
        hitTestSource: any
        hitTestSourceRequested: boolean
        hitTestResults: any[]
        reticle: Mesh
        currentFrame: SvelthreeXRFrame
    }

    interface StoreBody {
        id: number
        canvas: StoreCanvas
        scenes: Scene[]
        // this will always be +1 real index, because index '0' means 'false',
        // so change from 'undefined' to '0' will not be triggered.
        currentSceneIndex: number
        cameras: Camera[]
        cubeCameras: SvelteComponentDev[]
        activeCamera: Camera
        renderer: WebGLRenderer
        rendererComponent: SvelteComponentDev
        raycaster: Raycaster
        allIntersections: any[]
        pointer: StorePointer
        orbitcontrols: OrbitControls
        xr: XR
        useBVH: boolean
    }

    const svelthreeStoreBody: StoreBody = {
        id: undefined,
        canvas: {
            dom: undefined,
            dim: { w: undefined, h: undefined },
            interactive: false
        },
        scenes: [],
        // this will always be +1 real index, because index '0' means 'false',
        // so change from 'undefined' to '0' will not be triggered.
        currentSceneIndex: undefined,
        cameras: [],
        cubeCameras: [],
        activeCamera: undefined,
        renderer: undefined,
        rendererComponent: undefined,
        raycaster: undefined,
        allIntersections: undefined,
        pointer: {
            pos: new Vector2(-1, -1),
            event: undefined,
            isOverCanvas: false,
            unprojected: new Vector3()
        },
        orbitcontrols: undefined,
        xr: {
            sessionMode: undefined,
            //currentVRInputType: undefined,
            inputConfig: undefined,
            controller: undefined,
            controllerConfig: undefined,
            controllers: [],
            enablePinch: undefined,
            //handProfile: undefined,
            enableTouch: undefined,
            touchEvents: undefined,
            enableTouchX: undefined,
            leftHandTouchEnabled: undefined,
            leftHandTouchEnabledJoints: undefined,
            rightHandTouchEnabled: undefined,
            rightHandTouchEnabledJoints: undefined,
            leftHandPinchEnabled: false,
            leftHandPinchConfig: undefined,
            rightHandPinchEnabled: false,
            rightHandPinchConfig: undefined,
            requiredFeatures: [],
            optionalFeatures: [],
            domOverlay: undefined,
            hitTestModeInitial: undefined,
            hitTestMode: undefined,
            hitTestSource: null,
            hitTestSourceRequested: false,
            hitTestResults: undefined,
            reticle: undefined,
            currentFrame: {
                timestamp: 0,
                delta: 0,
                frame: undefined
            }
        },
        useBVH: false
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
        $svelthreeStores[sti].canvas.dom === undefined ? ($svelthreeStores[sti].canvas.dom = c) : null
    }

    $: w ? (svelthreeStoreBody.canvas.dim.w = w) : null
    $: h ? (svelthreeStoreBody.canvas.dim.h = h) : null

    let originalThreeRaycastFunction: (raycaster: Raycaster, intersects: Intersection[]) => void
    export let useBVH: boolean = undefined
    $: if (useBVH) {
        $svelthreeStores[sti].useBVH = useBVH

        if (!BufferGeometry.prototype["computeBoundsTree"]) {
            //backup original raycast function
            originalThreeRaycastFunction = Mesh.prototype.raycast

            BufferGeometry.prototype["computeBoundsTree"] = computeBoundsTree
            BufferGeometry.prototype["disposeBoundsTree"] = disposeBoundsTree
            Mesh.prototype.raycast = acceleratedRaycast
        }
    } else {
        $svelthreeStores[sti].useBVH = useBVH

        if (BufferGeometry.prototype["computeBoundsTree"]) {
            BufferGeometry.prototype["computeBoundsTree"] = undefined
            BufferGeometry.prototype["disposeBoundsTree"] = undefined

            //restore original raycast function
            Mesh.prototype.raycast = originalThreeRaycastFunction
        }
    }

    export let interactive: boolean = undefined
    let isInteractive = false
    let raycaster: Raycaster

    // reactive create raycaster
    $: if (isInteractive && !raycaster && c && $svelthreeStores[sti].renderer) {
        raycaster = new Raycaster()
        $svelthreeStores[sti].raycaster = raycaster
        $svelthreeStores[sti].canvas.interactive = true

        if ($svelthreeStores[sti].renderer.xr.enabled === false) {
            startUpdatingPointer()
        }

        console.info("SVELTHREE > Canvas : after Raycaster creation, $svelthreeStores[sti]: ", $svelthreeStores[sti])
    }

    // reactive remove raycaster
    $: if (!isInteractive && raycaster && $svelthreeStores[sti].renderer) {
        $svelthreeStores[sti].canvas.interactive = false
        $svelthreeStores[sti].raycaster = undefined
        raycaster = null

        if ($svelthreeStores[sti].renderer.xr.enabled === false) {
            stopUpdatingPointer()
        }

        console.info("SVELTHREE > Canvas : after Raycaster remove, $svelthreeStores[sti]: ", $svelthreeStores[sti])
    }

    let didMount: boolean

    $: didMount ? (isInteractive = interactive) : null

    function startUpdatingPointer(): void {
        window.addEventListener("pointermove", updatePointer, false)
    }

    function updatePointer(e: PointerEvent): void {
        let rect: ClientRect = c.getBoundingClientRect()

        $svelthreeStores[sti].pointer.pos.x = ((e.clientX - rect.left) / (rect.right - rect.left)) * 2 - 1
        $svelthreeStores[sti].pointer.pos.y = -((e.clientY - rect.top) / (rect.bottom - rect.top)) * 2 + 1

        e.clientX > rect.left && e.clientX < rect.right && e.clientY > rect.top && e.clientY < rect.bottom
            ? ($svelthreeStores[sti].pointer.isOverCanvas = true)
            : ($svelthreeStores[sti].pointer.isOverCanvas = false)

        // calculate unprojected Point
        // see https://stackoverflow.com/questions/13055214/mouse-canvas-x-y-to-three-js-world-x-y-z
        let v: Vector3 = new Vector3($svelthreeStores[sti].pointer.pos.x, $svelthreeStores[sti].pointer.pos.y, 0.5)
        let t: Vector3 = new Vector3()
        v.unproject($svelthreeStores[sti].activeCamera)
        v.sub($svelthreeStores[sti].activeCamera.position).normalize()
        let d = -$svelthreeStores[sti].activeCamera.position.z / v.z
        t.copy($svelthreeStores[sti].activeCamera.position).add(v.multiplyScalar(d))
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
        console.info("SVELTHREE > onMount : Canvas, $svelthreeStores[sti]: ", $svelthreeStores[sti])

        return () => {
            console.info("SVELTHREE > onDestroy : Canvas")
            stopUpdatingPointer()
            // if canvas is being removed set the the whole store to 'null'
            // this way we don't have to handle anything, other store 'sti' will remain valid
            // any newly added canvas will create a new store at the next highest index
            // the value of 'sti' is completely irrelevant to the user, doesn't need to be handled.
            $svelthreeStores[sti] = null
        }
    })

    /**
     * Public methods
     */

    export function resize(w: number, h: number) {
        $svelthreeStores[sti].canvas.dim = { w: w, h: h }
    }

    export function getDomElement(): HTMLCanvasElement {
        return $svelthreeStores[sti].canvas.dom
    }

    export function getDomElementDimensions(): { w: number; h: number } {
        return {
            w: $svelthreeStores[sti].canvas.dom.width,
            h: $svelthreeStores[sti].canvas.dom.height
        }
    }

    export function resizeStyle(w: number, h: number) {
        $svelthreeStores[sti].canvas.dom.style.width = `${w}px`
        $svelthreeStores[sti].canvas.dom.style.height = `${h}px`
    }

    export function resizeAll(w: number, h: number) {
        resize(w, h)
        resizeStyle(w, h)
    }
</script>

<canvas bind:this={c} width={w} height={h} {style} class={clazz}>
    <slot {sti} />
</canvas>
