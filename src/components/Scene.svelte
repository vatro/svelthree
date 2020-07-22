<script lang="typescript">
    /**
     * @author Vatroslav Vrbanic @see https://github.com/vatro
     */

    import { onMount } from "svelte"
    import { svelthreeStores } from "../stores.js"
    import { Scene, Color } from "svelthree-three"

    export let id: string = undefined
    if (!id) {
        console.warn(
            "SVELTHREE > Scene : You have to provide an 'id' prop (not empty String) for Scenes in order to assign them to a 'WebGLRenderer' component!",
            { id: id }
        )
        throw new Error("SVELTHREE Exception (see warning above)")
    }

    //props object can be filled with anything, ideally available THREE props of course.
    export let props: { [key: string]: any } = undefined

    export let sti: number

    if (sti === undefined) {
        console.warn(
            "SVELTHREE > Scene : You have to provide a {sti} prop for the Scene!",
            { sti: sti }
        )
        throw new Error("SVELTHREE Exception (see warning above)")
    }

    const svelthreeStore = $svelthreeStores[sti]

    let scene: Scene = new Scene()

    scene.userData.isActive = false
    scene.userData.id = id
    scene.userData.sti = sti
    scene.userData.animations = []
    scene.userData.indexInScenes = svelthreeStore.scenes.length
    svelthreeStore.scenes.push({ scene: scene, id: id, isActive: false })

    onMount(() => {
        console.info("SVELTHREE > onMount : Scene", { sti: sti })

        for (let p in props) {
            switch (p) {
                case "background":
                    scene[p] = new Color(props[p])
                    break
            }
        }

        return () => {
            console.info("SVELTHREE > onDestroy : Scene")
            // TODO  remove self from svelthreeStore
        }
    })

    /**
     * Public methods
     */

    export function getScene(): Scene {
        return scene
    }

    export function getId(): string {
        return id
    }
</script>

<slot {scene} />
