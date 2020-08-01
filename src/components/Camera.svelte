<script lang="typescript">
    /**
     * @author Vatroslav Vrbanic @see https://github.com/vatro
     */

    import { onMount } from "svelte"
    import { UniversalPropIterator } from "../utils/UniversalPropIterator.svelte"
    import { Object3DUtils } from "../utils/Object3DUtils.svelte"
    import { isValidMatrix4 } from "../utils/PropUtils.svelte"
    import { svelthreeStores } from "../stores.js"
    import { Scene, Camera } from "svelthree-three"
    import type {
        PropPos,
        PropRot,
        PropLookAt,
        PropMatrix4
    } from "../utils/Sv3Types.svelte"
    import SvelthreeAnimation from "./SvelthreeAnimation.svelte"

    let ani: any

    // construction
    export let scene: Scene
    let sti: number

    if (scene) {
        if (scene.type === "Scene") {
            setSTI()
        } else {
            console.warn(
                "SVELTHREE > Camera : You have to provide a valid 'scene' prop of type 'Scene'!",
                { scene: scene }
            )
            throw new Error("SVELTHREE Exception (see warning above)")
        }
    } else {
        console.warn(
            "SVELTHREE > Camera : You have to provide a {scene} prop!",
            { scene: scene }
        )
        throw new Error("SVELTHREE Exception (see warning above)")
    }

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
    let object3DUtils: Object3DUtils
    let camPropIterator: UniversalPropIterator

    if (cam) {
        object3DUtils = new Object3DUtils(cam)
        camPropIterator = new UniversalPropIterator(cam)
    } else {
        console.warn(
            "SVELTHREE > Camera : camera was not provided by parent component!",
            { cam: cam }
        )
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
    export let pos: PropPos = [0, 0, 2] //default position off [0,0,0] to prevent camera inside object on initialization
    export let rot: PropRot = [0, 0, 0]
    export let lookAt: PropLookAt = [0, 0, 0] //default lookAt

    // TODO  implement updating Matrix
    export let matrix: PropMatrix4 = undefined

    //props object can be filled with anything, ideally available THREE props of course.
    export let props: { [key: string]: any } = undefined

    $: !matrix ? (object3DUtils.tryPosUpdate(pos), tryControlsUpdate()) : null

    $: !matrix ? object3DUtils.tryRotUpdate(rot) : null

    $: !matrix ? object3DUtils.tryLookAtUpdate(lookAt) : null

    // TODO  implement updating Matrix
    $: isValidMatrix4(matrix)
        ? (console.warn(
              "SVELTHREE > Camera : Matrix provided, will ignore 'pos' or 'rot' props if any provided!"
          ),
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

    function setSTI() {
        if (scene.userData.sti >= 0) {
            sti = scene.userData.sti
        } else {
            console.warn(
                "SVELTHREE > Camera : Failed to set 'sti' from 'scene.userData.sti', 'sti' has to be >= 0!",
                {
                    scene: scene,
                    userData: scene.userData,
                    sti: scene.userData.sti
                }
            )
            throw new Error("SVELTHREE Exception (see warning above)")
        }
    }

    // TODO  implement updating Matrix
    function tryMatrixUpdate(): void {
        console.error(
            "SVELTHREE > Camera : updating Matrix is not yet implemented!"
        )
    }

    function tryControlsUpdate(): void {
        $svelthreeStores["orbitcontrols"]
            ? $svelthreeStores["orbitcontrols"].update()
            : null
    }

    // reactive animation handling (has to be enabled as last, so that initial animation state overrides props)

    let currentSceneActive = false

    $: currentSceneActive =
        $svelthreeStores[sti].scenes[scene.userData.indexInScenes].isActive

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
        return $svelthreeStores[sti].cameras[cam.userData.indexInCameras].camera
            .userData.indexInCameras
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
