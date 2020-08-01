<script lang="typescript">
    /**
     * @author Vatroslav Vrbanic @see https://github.com/vatro
     */

    import { onMount } from "svelte"
    import { Object3D, Scene } from "svelthree-three"
    import { svelthreeStores } from "../stores.js"
    import { UniversalPropIterator } from "../utils/UniversalPropIterator.svelte"
    import { Object3DUtils } from "../utils/Object3DUtils.svelte"
    import type {
        PropPos,
        PropRot,
        PropScale,
        PropMatrix4
    } from "../utils/Sv3Types.svelte"
    import {
        isValidArray3Prop,
        isValidMatrix4
    } from "../utils/PropUtils.svelte"

    import SvelthreeAnimation from "./SvelthreeAnimation.svelte"

    let ani: any

    // construction

    export let name: string = undefined
    export let parent: Object3D = undefined
    export let parentForSlot: Object3D = undefined
    export let parentForUs: Object3D = undefined
    export let aniauto: boolean = undefined

    export let scene: Scene = undefined
    let sti: number

    if (scene) {
        if (scene.type === "Scene") {
            setSTI()
        } else {
            console.warn(
                "SVELTHREE > Empty : You have to provide a valid 'scene' prop of type 'Scene'!",
                { scene: scene }
            )
            throw new Error("SVELTHREE Exception (see warning above)")
        }
    } else {
        console.warn(
            "SVELTHREE > Empty : You have to provide a {scene} prop!",
            { scene: scene }
        )
        throw new Error("SVELTHREE Exception (see warning above)")
    }

    let empty: Object3D = new Object3D()
    empty.name = name
    let object3DUtils: Object3DUtils = new Object3DUtils(empty)
    let emptyPropIterator: UniversalPropIterator = new UniversalPropIterator(
        empty
    )

    scene.add(empty)
    console.info("SVELTHREE > EMPTY added!", {
        empty: empty,
        scene: scene,
        total: scene.children.length
    })

    /**
     * Determining parent immediately
     */
    if (!parent) {
        parentForSlot = empty
    } else {
        if (parent !== empty) {
            parentForUs = parent
            parentForSlot = empty
        }
    }

    addEmpty()

    function addEmpty(): void {
        if (!parentForUs) {
            if (empty.parent !== scene) {
                scene.add(empty)
                console.info(
                    "SVELTHREE > EMPTY " + empty.type + " added to scene!",
                    {
                        empty: empty,
                        scene: scene,
                        total: scene.children.length
                    }
                )
            }
        } else {
            if (empty.parent !== parentForUs) {
                parentForUs.add(empty)
                console.info(
                    "SVELTHREE > EMPTY " + empty.type + " added to parent!",
                    {
                        empty: empty,
                        scene: scene,
                        total: scene.children.length
                    }
                )
            }
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

    export let pos: PropPos = [0, 0, 0]
    export let rot: PropRot = [0, 0, 0]
    export let scale: PropScale = [1, 1, 1]

    // TODO  Implement
    export let matrix: PropMatrix4 = undefined

    //props object can be filled with anything, ideally available THREE props of course.
    export let props: { [key: string]: any } = undefined

    $: !matrix
        ? isValidArray3Prop(pos)
            ? object3DUtils.tryPosUpdate(pos)
            : null
        : null
    $: !matrix
        ? isValidArray3Prop(rot)
            ? object3DUtils.tryRotUpdate(rot)
            : null
        : null
    $: !matrix
        ? isValidArray3Prop(scale)
            ? object3DUtils.tryScaleUpdate(scale)
            : null
        : null
    $: isValidMatrix4(matrix)
        ? (console.warn(
              "SVELTHREE > Empty : Matrix provided, will ignore 'pos', 'rot' or 'scale' props if any provided!"
          ),
          tryMatrixUpdate())
        : null

    $: props
        ? Object.keys(props).length > 0
            ? emptyPropIterator
                ? emptyPropIterator.tryPropsUpdate(props)
                : null
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
                  console.info("SVELTHREE > onMount : Empty")
                  return () => {
                      console.info("SVELTHREE > onDestroy : Empty")
                      removeEmptyFromParent()
                  }
              }
    )

    function setSTI() {
        if (scene.userData.sti >= 0) {
            sti = scene.userData.sti
        } else {
            console.warn(
                "SVELTHREE > Empty : Failed to set 'sti' from 'scene.userData.sti', 'sti' has to be >= 0!",
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
            "SVELTHREE > Empty : updating Matrix is not yet implemented!"
        )
    }

    export function removeEmptyFromParent(): void {
        empty.parent.remove(empty)
    }

    export function getEmpty(): Object3D {
        return empty
    }

    export function getName(): string {
        return name
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
</script>

<slot {scene} parent={parentForSlot} />

<SvelthreeAnimation
    bind:this={ani}
    bind:currentSceneActive
    {animationEnabled}
    {animation}
    {aniauto}
    obj={empty}
    {scene} />
