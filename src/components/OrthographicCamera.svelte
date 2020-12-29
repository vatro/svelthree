<!-- 
@component
This is a **svelthree** _OrthographicCamera_ Component.  
// TODO : Describe in detail.
-->
<script lang="typescript">
    /**
     * @author Vatroslav Vrbanic @see https://github.com/vatro
     */

    import { OrthographicCamera, CameraHelper, Scene, Vector3, Euler } from "svelthree-three"
    import { svelthreeStores } from "../stores.js"
    import Camera from "./Camera.svelte"
    import { onMount } from "svelte"
    import StoreUtils from "../utils/StoreUtils"

    export let scene: Scene

    const sti: number = StoreUtils.getSTIfromScene(scene, "OrthographicCamera")

    export let id: string = undefined

    if (!id) {
        console.warn(
            "SVELTHREE > OrthographicCamera : you have to provide an 'id' prop (not empty String) for Cameras in order to assign them to a 'WebGLRenderer' component!",
            { id: id }
        )
        throw new Error("SVELTHREE Exception (see warning above)")
    }

    export let animation: any = undefined
    export let aniauto = false

    export let pos: Vector3 | Parameters<Vector3["set"]> | number[] = undefined
    export let rot: Euler | Parameters<Euler["set"]> | [number, number, number] = undefined
    export let lookAt: Vector3 | Parameters<Vector3["set"]> = undefined
    export let frustumSize = 2.5 //default frustum size
    export let aspect = 1 //default aspect (width to height)
    export let near = 0.1 //default near
    export let far = 2000 //default far

    const defaultParams: ConstructorParameters<typeof OrthographicCamera> = [
        (frustumSize * aspect) / -2, // left
        (frustumSize * aspect) / 2, // right
        frustumSize / 2, // top
        frustumSize / -2, // bottom
        near,
        far
    ]

    // TODO  Implement
    export let matrix = undefined

    export let params: ConstructorParameters<typeof OrthographicCamera> = undefined

    //props object can be filled with anything, ideally available THREE props of course.
    export let props: { [key: string]: any } = undefined

    const cam =
        params && params.length > 0 ? new OrthographicCamera(...params) : new OrthographicCamera(...defaultParams)

    /*
    params && params.length > 0
        ? (cam = new OrthographicCamera(...params))
        : (cam = new OrthographicCamera(...defaultParams))
        */

    export let helper = undefined

    let camHelper: CameraHelper = undefined

    $: !camHelper && cam && helper ? createHelper() : null

    onMount(() => {
        console.info("SVELTHREE > onMount : OrthographicCamera")
        startUpdatingHelper()
        return () => {
            console.info("SVELTHREE > onDestroy : OrthographicCamera")
            stopUpdatingHelper()
        }
    })

    function createHelper(): void {
        camHelper = new CameraHelper(cam)
        scene.add(camHelper)
        camHelper.visible = false
        console.info("SVELTHREE > " + cam.type + " HELPER added!", {
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
            updateHelper_rAF = requestAnimationFrame(updateHelper)
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
        let aspect = canvasW / canvasH

        cam.left = (frustumSize * aspect) / -2 // left
        cam.right = (frustumSize * aspect) / 2 // right
        cam.top = frustumSize / 2 // top
        cam.bottom = frustumSize / -2 // bottom

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
