<!-- 
@author Vatroslav Vrbanic | https://github.com/vatro
@component
This is a **svelthree** _PerspectiveCamera_ Component.  
// TODO : Describe in detail.
-->
<script lang="typescript">
    import { PerspectiveCamera, CameraHelper, Scene, Vector3, Euler } from "svelthree-three"
    import Camera from "./Camera.svelte"
    import { onMount } from "svelte"
    import { svelthreeStores } from "../stores.js"
    import StoreUtils from "../utils/StoreUtils"
    import ExposedPropKeys from "../constants/ExposedPropKeys"

    export let scene: Scene

    const sti: number = StoreUtils.getSTIfromScene(scene, "PerspectiveCamera")

    export let id: string = undefined
    if (!id) {
        console.warn(
            "SVELTHREE > PerspectiveCamera : you have to provide an 'id' prop (not empty String) for Cameras in order to assign them to a 'WebGLRenderer' component!",
            { id: id }
        )
        throw new Error("SVELTHREE Exception (see warning above)")
    }

    export let params: ConstructorParameters<typeof PerspectiveCamera> = undefined

    let cam: PerspectiveCamera
    params && params.length > 0 ? (cam = new PerspectiveCamera(...params)) : (cam = new PerspectiveCamera())

    export let animation: any = undefined
    export let aniauto = false

    export let pos: Vector3 | Parameters<Vector3["set"]> | number[] = undefined
    export let rot: Euler | Parameters<Euler["set"]> | [number, number, number] = undefined
    export let lookAt: Vector3 | Parameters<Vector3["set"]> | number[] = undefined

    // TODO  Implement
    export let matrix: THREE.Matrix4 = undefined

    //props object can be filled with anything, ideally available THREE props of course.
    type PerspectiveCameraProps = OnlyExposedProps<
        PerspectiveCamera,
        typeof ExposedPropKeys.perspectiveCamera[number]
    > & { lookAt: Vector3 | Parameters<Vector3["set"]> | number[] } & Object3DProps

    export let props: { [P in keyof PerspectiveCameraProps]: PerspectiveCameraProps[P] } = undefined

    export let helper = false

    let camHelper: CameraHelper = undefined
    $: !camHelper && cam && helper ? createHelper() : null

    onMount(() => {
        console.info("SVELTHREE > onMount : " + cam.type)
        startUpdatingHelper()
        return () => {
            console.info("SVELTHREE > onDestroy : " + cam.type)
            stopUpdatingHelper()
        }
    })

    function createHelper(): void {
        camHelper = new CameraHelper(cam)
        scene.add(camHelper)
        camHelper.visible = false
        console.info("SVELTHREE > " + cam.type + " : HELPER added!", {
            camHelper: camHelper,
            scene: scene,
            total: scene.children.length
        })
    }

    let doUpdateHelper = false
    let updateHelper_rAF = 0

    function startUpdatingHelper() {
        doUpdateHelper = true
        updateHelper_rAF = requestAnimationFrame(updateHelper)
    }

    function stopUpdatingHelper(): void {
        doUpdateHelper = false
        cancelAnimationFrame(updateHelper_rAF)
    }

    function updateHelper(): void {
        if (doUpdateHelper) {
            camHelper ? camHelper.update() : null
            requestAnimationFrame(updateHelper)
        }
    }

    let canvas: HTMLCanvasElement = undefined
    $: canvas = $svelthreeStores[sti].canvas.dom

    let canvasW: number
    let canvasH: number

    $: canvasW = $svelthreeStores[sti].canvas.dim.w
    $: canvasH = $svelthreeStores[sti].canvas.dim.h
    $: (canvasW || canvasH) && canvas ? updateCameraAspect() : null

    function updateCameraAspect(): void {
        console.info("SVELTHREE > OrthographicCamera : updateCameraAspect!")
        cam.aspect = canvasW / canvasH
        cam.updateProjectionMatrix()
    }

    /**
     * Public methods
     */

    export function getHelper(): CameraHelper {
        return camHelper
    }

    export function getId(): string {
        return id
    }

    let camera: Camera

    export function getCamera(): THREE.Camera {
        return camera.getCamera()
    }

    export function getIndexInCameras(): number {
        return camera.getIndexInCameras()
    }

    export function getSTI(): number {
        return camera.getSTI()
    }
</script>

<Camera bind:this={camera} {scene} {cam} {id} {pos} {rot} {lookAt} {matrix} {props} {animation} {aniauto} />
