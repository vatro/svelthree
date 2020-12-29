<!-- 
@component
This is a **svelthree** _Empty_ Component.  
// TODO : Describe in detail.
-->
<script lang="typescript">
    /**
     * @author Vatroslav Vrbanic @see https://github.com/vatro
     */

    import { onMount } from "svelte"
    import { Euler, Object3D, Scene, Vector3 } from "svelthree-three"
    import { svelthreeStores } from "../stores.js"
    import UniversalPropIterator from "../utils/UniversalPropIterator"
    import Object3DUtils from "../utils/Object3DUtils"
    import PropUtils from "../utils/PropUtils"
    import StoreUtils from "../utils/StoreUtils"

    import SvelthreeAnimation from "./SvelthreeAnimation.svelte"

    let ani: any

    // construction

    export let name: string = undefined
    export let parent: Object3D = undefined
    export let parentForSlot: Object3D = undefined
    export let parentForUs: Object3D = undefined
    export let aniauto: boolean = undefined

    export let scene: Scene = undefined
    const sti: number = StoreUtils.getSTIfromScene(scene, "Empty")

    let empty: Object3D = new Object3D()
    empty.name = name
    let emptyPropIterator: UniversalPropIterator = new UniversalPropIterator(empty)

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
                console.info("SVELTHREE > EMPTY " + empty.type + " added to scene!", {
                    empty: empty,
                    scene: scene,
                    total: scene.children.length
                })
            }
        } else {
            if (empty.parent !== parentForUs) {
                parentForUs.add(empty)
                console.info("SVELTHREE > EMPTY " + empty.type + " added to parent!", {
                    empty: empty,
                    scene: scene,
                    total: scene.children.length
                })
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

    export let pos: Vector3 | Parameters<Vector3["set"]> | number[] = [0, 0, 0]
    export let rot: Euler | Parameters<Euler["set"]> | [number, number, number]
    export let scale: Vector3 | Parameters<Vector3["set"]> = [1, 1, 1]

    // TODO  Implement
    export let matrix: THREE.Matrix4 = undefined

    //props object can be filled with anything, ideally available THREE props of course.
    export let props: { [key: string]: any } = undefined

    $: !matrix ? (PropUtils.isValidArray3Prop(pos) ? Object3DUtils.tryPosUpdate(empty, pos) : null) : null
    $: !matrix ? (PropUtils.isValidArray3Prop(rot) ? Object3DUtils.tryRotUpdate(empty, rot) : null) : null
    $: !matrix ? (PropUtils.isValidArray3Prop(scale) ? Object3DUtils.tryScaleUpdate(empty, scale) : null) : null
    $: PropUtils.isValidMatrix4(matrix)
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

    $: $svelthreeStores[sti].scenes[scene.userData.indexInScenes] !== undefined
        ? (currentSceneActive = $svelthreeStores[sti].scenes[scene.userData.indexInScenes].isActive)
        : null

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

    // TODO  implement updating Matrix
    function tryMatrixUpdate(): void {
        console.error("SVELTHREE > Empty : updating Matrix is not yet implemented!")
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
