<!-- 
@component
This is a **svelthree** _OrthographicCamera_ Component.  
// TODO : Describe in detail.
-->
<script lang="typescript">
    /**
     * @author Vatroslav Vrbanic @see https://github.com/vatro
     */

    import { OrthographicCamera, CameraHelper, Scene } from "svelthree-three"
    import Camera from "./Camera.svelte"
    import { onMount } from "svelte"
    import type { PropPos, PropRot, PropLookAt } from "../utils/SvelthreeTypes"

    export let scene: Scene
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

    export let pos: PropPos = undefined
    export let rot: PropRot = undefined
    export let lookAt: PropLookAt = undefined
    export let frustumSize = 1000 //default frustum size
    export let aspect = 1 //default aspect
    export let near = 0.1 //default near
    export let far = 2000 //default far

    // TODO  Implement
    export let matrix = undefined

    export let params: ConstructorParameters<typeof OrthographicCamera> = undefined

    //props object can be filled with anything, ideally available THREE props of course.
    export let props: { [key: string]: any } = undefined

    let cam: OrthographicCamera = undefined

    params && params.length > 0
        ? (cam = new OrthographicCamera(...params))
        : // TODO  INCONSISTENCY  we said we don't want to hardcode constructor and now we're doing it as default init config!
          (cam = new OrthographicCamera(
              (frustumSize * aspect) / -2,
              (frustumSize * aspect) / 2,
              frustumSize / 2,
              frustumSize / -2,
              near,
              far
          ))

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
