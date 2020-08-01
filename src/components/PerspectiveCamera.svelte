<script lang="typescript">
    /**
     * @author Vatroslav Vrbanic @see https://github.com/vatro
     */

    import { PerspectiveCamera, CameraHelper, Scene } from "svelthree-three"
    import Camera from "./Camera.svelte"
    import { onMount } from "svelte"
    import type {
        PropPos,
        PropRot,
        PropLookAt,
        PropMatrix4
    } from "../utils/Sv3Types.svelte"

    export let scene: Scene
    export let id: string = undefined
    if (!id) {
        console.warn(
            "SVELTHREE > PerspectiveCamera : you have to provide an 'id' prop (not empty String) for Cameras in order to assign them to a 'WebGLRenderer' component!",
            { id: id }
        )
        throw new Error("SVELTHREE Exception (see warning above)")
    }

    export let animation: any = undefined
    export let aniauto = false

    export let pos: PropPos = undefined
    export let rot: PropRot = undefined
    export let lookAt: PropLookAt = undefined

    // TODO  Implement
    export let matrix: PropMatrix4 = undefined

    //props object can be filled with all available Theejs-PerspectiveCamera parameters and props
    //PerspectiveCamera( fov : Number, aspect : Number, near : Number, far : Number )

    // TOFIX  (compiles) if possible --> Type '{ [key: string]: any; }' must have a '[Symbol.iterator]()' method that returns an iterator.
    // WHY?  not just hardcode contructor arguments?  ANSWER  Avoiding maintaning THREE constructor changes, let THREE report constructor API Errors.
    export let config: { [key: string]: any } = undefined

    //props object can be filled with anything, ideally available THREE props of course.
    export let props: { [key: string]: any } = undefined

    let cam: PerspectiveCamera
    config && config.length > 0
        ? // TOFIX  (compiles) if possible --> Expected 4-6 arguments, but got 0 or more.
          // WHY?  not just hardcode contructor arguments?  ANSWER  Avoiding maintaning THREE constructor changes, let THREE report constructor API Errors.
          (cam = new PerspectiveCamera(...config))
        : (cam = new PerspectiveCamera())

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

    /**
     * Public methods
     */

    export function getHelper(): CameraHelper {
        return camHelper
    }

    export function getId(): string {
        return id
    }

    /*
    export function getCamera() {
        return cam;
    }
     */

    /** TODO  how to type Svelte components?
     * type SvelteComponent = import('*.svelte').default
     * */

    // TODO  do I have to write an Interface by myself?
    let camera: Camera // typeof = 'object'

    export function getCamera(): Camera {
        // TODO  keep an eye on it / fix. compiles without errors, so leave it.
        return camera.getCamera()
    }

    export function getIndexInCameras(): number {
        return camera.getIndexInCameras()
    }

    export function getSTI(): number {
        return camera.getSTI()
    }
</script>

<Camera
    bind:this={camera}
    {scene}
    {cam}
    {id}
    {pos}
    {rot}
    {lookAt}
    {matrix}
    {props}
    {animation}
    {aniauto} />
