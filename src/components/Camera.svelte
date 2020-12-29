<!-- 
@component
This is a **svelthree** _Camera_ Component.  
// TODO : Describe in detail.
-->
<script lang="typescript">
    /**
     * @author Vatroslav Vrbanic @see https://github.com/vatro
     */

    import { onMount } from "svelte"
    import UniversalPropIterator from "../utils/UniversalPropIterator"
    import Object3DUtils from "../utils/Object3DUtils"
    import PropUtils from "../utils/PropUtils"
    import { svelthreeStores } from "../stores.js"
    import { Scene, Camera, Euler, Vector3 } from "svelthree-three"
    import SvelthreeAnimation from "./SvelthreeAnimation.svelte"
    import StoreUtils from "../utils/StoreUtils"

    let ani: any

    // construction
    export let scene: Scene
    const sti: number = StoreUtils.getSTIfromScene(scene, "Camera")

    export let animation: (
        obj: any,
        ...args: any[]
    ) => {
        onStart: () => void
        onDestroy: () => void
        onSceneDeactivated?: () => void
        onSceneReactivated?: () => void
    } = undefined

    export let aniauto: boolean = undefined
    export let id: string = undefined

    export let cam: Camera
    let camPropIterator: UniversalPropIterator

    if (cam) {
        camPropIterator = new UniversalPropIterator(cam)
    } else {
        console.warn("SVELTHREE > Camera : camera was not provided by parent component!", { cam: cam })
        throw new Error("SVELTHREE Exception (see warning above)")
    }

    scene.add(cam)

    console.info("SVELTHREE > Camera : " + cam.type + " was added to scene!", {
        cam: cam,
        scene: scene,
        total: scene.children.length
    })

    cam.userData.id = id
    cam.userData.isActive = false
    cam.userData.indexInCameras = $svelthreeStores[sti].cameras.length

    $svelthreeStores[sti].cameras.push({
        camera: cam,
        id: id,
        isActive: false
    })

    // optional props
    // shorthand props can be set directly as props

    // TODO : document default values
    export let pos: Vector3 | Parameters<Vector3["set"]> | number[] | number[] = [0, 0, 2] //default position off [0,0,0] to prevent camera inside object on initialization
    export let rot: Euler | Parameters<Euler["set"]> | [number, number, number] = [0, 0, 0] //default rotation
    export let lookAt: Vector3 | Parameters<Vector3["set"]> | number[] = [0, 0, 0] //default lookAt

    // TODO  implement updating Matrix
    export let matrix: THREE.Matrix4 = undefined

    //props object can be filled with anything, ideally available THREE props of course.
    export let props: { [key: string]: any } = undefined

    $: !matrix && pos ? (Object3DUtils.tryPosUpdate(cam, pos), tryControlsUpdate()) : null
    $: !matrix && pos ? Object3DUtils.tryRotUpdate(cam, rot) : null
    $: !matrix && pos ? Object3DUtils.tryLookAtUpdate(cam, lookAt) : null

    // TODO  implement updating Matrix
    $: PropUtils.isValidMatrix4(matrix)
        ? (console.warn("SVELTHREE > Camera : Matrix provided, will ignore 'pos' or 'rot' props if any provided!"),
          tryMatrixUpdate())
        : null

    $: props
        ? Object.keys(props).length > 0
            ? camPropIterator
                ? camPropIterator.tryPropsUpdate(props)
                : null
            : null
        : null

    export let fnOnMount: any = undefined

    onMount(
        fnOnMount
            ? () => fnOnMount(self)
            : () => {
                  console.info("SVELTHREE > onMount : Camera")
                  return () => {
                      console.info("SVELTHREE > onDestroy : Camera")
                      removeCameraFromParent()
                  }
              }
    )

    // TODO  implement updating Matrix
    function tryMatrixUpdate(): void {
        console.error("SVELTHREE > Camera : updating Matrix is not yet implemented!")
    }

    function tryControlsUpdate(): void {
        $svelthreeStores["orbitcontrols"] ? $svelthreeStores["orbitcontrols"].update() : null
    }

    // reactive animation handling (has to be enabled as last, so that initial animation state overrides props)

    let currentSceneActive = false

    $: $svelthreeStores[sti].scenes[scene.userData.indexInScenes] !== undefined
        ? (currentSceneActive = $svelthreeStores[sti].scenes[scene.userData.indexInScenes].isActive)
        : null

    let animationEnabled = false
    $: animation ? (animationEnabled = true) : null

    // -----------------------------------

    export function removeCameraFromParent(): void {
        cam.parent.remove(cam)
    }

    export function getCamera(): Camera {
        return $svelthreeStores[sti].cameras[cam.userData.indexInCameras].camera
    }

    export function getIndexInCameras(): number {
        return $svelthreeStores[sti].cameras[cam.userData.indexInCameras].camera.userData.indexInCameras
    }

    export function getSTI(): number {
        return sti
    }

    export function getScene(): Scene {
        return scene
    }

    // --- Animation related public methods ---

    export function getAnimation(): any {
        return ani.getAnimation()
    }

    export function startAni(): void {
        ani.startAni()
    }

    // ----------- Interaction ---------------
    // TODO : Add ability to add Camera to an Interaction-Dummy (Mesh) like with Lights
</script>

<SvelthreeAnimation
    bind:this={ani}
    bind:currentSceneActive
    {animationEnabled}
    {animation}
    {aniauto}
    obj={cam}
    {scene} />
