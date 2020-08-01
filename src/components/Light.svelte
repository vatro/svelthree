<script lang="typescript">
    /**
     * @author Vatroslav Vrbanic @see https://github.com/vatro
     */

    import { onMount } from "svelte"
    import { svelthreeStores } from "../stores.js"
    import { Object3DUtils } from "../utils/Object3DUtils.svelte"
    import { LightUtils } from "../utils/LightUtils.svelte"
    import { UniversalPropIterator } from "../utils/UniversalPropIterator.svelte"
    import type { PropColor, PropPos } from "../utils/Sv3Types.svelte"
    import { Light, Scene, Object3D } from "svelthree-three"
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
                "SVELTHREE > Light : You have to provide a valid 'scene' prop of type 'Scene'!",
                { scene: scene }
            )
            throw new Error("SVELTHREE Exception (see warning above)")
        }
    } else {
        console.warn(
            "SVELTHREE > Light : You have to provide a {scene} prop!",
            { scene: scene }
        )
        throw new Error("SVELTHREE Exception (see warning above)")
    }

    function setSTI() {
        if (scene.userData.sti >= 0) {
            sti = scene.userData.sti
        } else {
            console.warn(
                "SVELTHREE > Light : Failed to set 'sti' from 'scene.userData.sti', 'sti' has to be >= 0!",
                {
                    scene: scene,
                    userData: scene.userData,
                    sti: scene.userData.sti
                }
            )
            throw new Error("SVELTHREE Exception (see warning above)")
        }
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

    export let parent: Object3D = undefined
    export let parentForUs: Object3D = undefined
    export let light: Light = undefined
    let lightUtils: LightUtils
    let object3DUtils: Object3DUtils
    let uniPropIterator: UniversalPropIterator

    if (light) {
        object3DUtils = new Object3DUtils(light)
        uniPropIterator = new UniversalPropIterator(light)
        lightUtils = new LightUtils(light)
    } else {
        console.warn(
            "SVELTHREE > Light : light was not provided by parent component!",
            { light: light }
        )
        throw new Error("SVELTHREE Exception (see warning above)")
    }

    if (parent) {
        //parent is already there, either it has been provided or set on mesh generation to the mesh itself
        //means this parent was provided and we are child
        if (parent !== light) {
            //set self as parent for next slot
            parentForUs = parent
        } else {
            /* nothing */
        }
    }

    tryAddingLight()

    function tryAddingLight(): void {
        if (!parentForUs) {
            //Add to scene if no parent was provided & scene is not parent already
            if (light.parent !== scene) {
                scene.add(light)
                console.info(
                    "SVELTHREE > Light : " +
                        light.type +
                        " was added to scene!",
                    {
                        light: light,
                        scene: scene,
                        total: scene.children.length
                    }
                )
            }
        } else {
            //Add to provided parent if it's not parent already
            if (light.parent !== parentForUs) {
                parentForUs.add(light)
                console.info(
                    "SVELTHREE > Light : " +
                        light.type +
                        " was added to parent!",
                    {
                        light: light,
                        parent: parentForUs,
                        scene: scene,
                        total: scene.children.length
                    }
                )
            }
        }
    }

    //props
    // shorthand props can be set directly as props
    export let pos: PropPos = [0, 1, 0] //default position off [0,0,0] to prevent light inside object on initialization
    export let color: PropColor = undefined
    export let intensity: number = 0 // 0 == 1
    export let shadowMapSize: number = undefined
    export let shadowBias: number = undefined
    export let castShadow: boolean = undefined

    //props object can be filled with all available Theejs-Mesh props
    export let props: { [key: string]: any } = undefined

    $: pos && pos.length > 0 ? object3DUtils.tryPosUpdate(pos) : null
    $: intensity ? lightUtils.tryIntensityUpdate(intensity) : null
    $: color ? lightUtils.tryColorUpdate(color) : null

    /**
     * @see https://threejs.org/docs/#api/en/constants/Renderer
     * @see https://threejs.org/docs/#api/en/lights/shadows/LightShadow
     * @see https://threejs.org/docs/#api/en/lights/shadows/DirectionalLightShadow
     *
     * THREE.BasicShadowMap
     * THREE.PCFShadowMap
     * THREE.PCFSoftShadowMap
     * THREE.VSMShadowMap
     */

    $: shadowMapSize ? lightUtils.tryShadowMapSizeUpdate(shadowMapSize) : null
    $: shadowBias ? lightUtils.tryShadowBiasUpdate(shadowBias) : null
    $: castShadow ? lightUtils.tryCastShadowUpdate(castShadow) : null

    $: props
        ? Object.keys(props).length > 0
            ? uniPropIterator.tryPropsUpdate(props)
            : null
        : null

    // reactive animation handling (has to be enabled as last, so that initial animation state overrides props)

    let currentSceneActive = false

    $: currentSceneActive =
        $svelthreeStores[sti].scenes[scene.userData.indexInScenes].isActive

    let animationEnabled = false
    $: animation ? (animationEnabled = true) : null

    // -----------------------------------

    export let fnOnMount: any = undefined

    onMount(
        fnOnMount
            ? () => fnOnMount(self)
            : () => {
                  console.info("SVELTHREE > onMount : Light")

                  return () => {
                      console.info("SVELTHREE > onDestroy : Light")
                      removeLightFromParent()
                  }
              }
    )

    // --- Public methods ---

    export function removeLightFromParent(): void {
        light.parent.remove(light)
    }

    // --- Animation related public methods ---

    export function getAnimation(): any {
        return ani.getAnimation()
    }

    export function startAni(): void {
        ani.startAni()
    }
</script>

<SvelthreeAnimation
    bind:this={ani}
    bind:currentSceneActive
    {animationEnabled}
    {animation}
    {aniauto}
    obj={light}
    {scene} />
