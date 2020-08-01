<script lang="typescript">
    import { onMount } from "svelte"
    import { SvelthreeAnimationManager } from "../utils/Sv3AnimationManager.svelte"
    import { Object3D, Scene } from "svelthree-three"
    import { AnimationProp } from "../utils/AnimationProp.svelte"

    export let animationEnabled: boolean = undefined
    export let animation: any = undefined
    export let aniauto: boolean = undefined
    export let obj: Object3D = undefined
    export let scene: Scene = undefined

    /** TODO : Would reactive autoani make sense?
     * Would have to reactivly recreate whole animation and restart it, but does this make sense on runtime?
     * 'autoani' is meant to be an initial setting, so rather not.
     */
    //$: aniauto || animation ? createAnimationManager() : null

    let aniManager: SvelthreeAnimationManager
    $: animation && animationEnabled ? createAnimationManager() : null

    function createAnimationManager() {
        //console.warn("SVELTHREE > createAnimationManager!")

        if (!aniManager) {
            animation = new AnimationProp(animation)
            aniManager = new SvelthreeAnimationManager(
                animation,
                aniauto,
                obj,
                scene
            )
        }
    }

    export let currentSceneActive: boolean

    $: if (currentSceneActive) {
        aniManager
            ? aniManager.handleCurrentSceneStatus(currentSceneActive)
            : null
    }

    export function getAnimation(): any {
        if (aniManager) {
            return aniManager.getAnimation()
        } else {
            console.error(
                "SVELTHREE > SvelthreeAnimation > destroyAnimation : missing SvelthreeAnimationManager!",
                { aniManager: aniManager }
            )
            return undefined
        }
    }

    export function destroyAnimation(): void {
        //console.warn("SVELTHREE > SvelthreeAnimation > destroyAnimation")
        if (aniManager) {
            aniManager.destroyAnimation()
        } else {
            if(animation && animationEnabled) {
                console.error(
                    "SVELTHREE > SvelthreeAnimation > destroyAnimation : missing SvelthreeAnimationManager!",
                    { aniManager: aniManager }
                )
            }
        }
    }

    export function startAni(): void {
        if (aniManager) {
            aniManager.startAni()
        } else {
            console.error(
                "SVELTHREE > SvelthreeAnimation > destroyAnimation : missing SvelthreeAnimationManager!",
                { aniManager: aniManager }
            )
        }
    }

    onMount(() => {
        //console.warn("SVELTHREE > onMount : SvelthreeAnimation")

        return () => {
            console.info("SVELTHREE > onDestroy : SvelthreeAnimation")
            destroyAnimation()
        }
    })
</script>
