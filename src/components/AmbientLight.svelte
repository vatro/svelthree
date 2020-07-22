<script lang="typescript">
    /**
     * @author Vatroslav Vrbanic @see https://github.com/vatro
     */

    import { onMount } from "svelte"
    import { AmbientLight, Scene } from "svelthree-three"
    import Light from "./Light.svelte"
    import type { PropColor } from "../utils/Sv3Types.svelte"

    export let props: { [key: string]: any } = undefined
    export let color: PropColor = undefined
    export let intensity: number = undefined

    /**
     * @see https://threejs.org/docs/#api/en/lights/AmbientLight
     * AmbientLight cannot be used to cast shadows as it doesn't have a direction.
     * Position is also irrelevant.
     */

    export let scene: Scene

    let light = new AmbientLight()

    export function getLight(): AmbientLight {
        return light
    }

    onMount(() => {
        console.info("SVELTHREE > onMount : AmbientLight")
        return () => {
            console.info("SVELTHREE > onDestroy : AmbientLight!")
        }
    })
</script>

<!-- cannot use {...$$props} see https://github.com/sveltejs/svelte/issues/4993 -->
<!-- TOFIX  as soon as landed (not in 3.24.0), see https://github.com/sveltejs/svelte/pull/5123  -->
<Light {scene} {light} {props} {color} {intensity} />
