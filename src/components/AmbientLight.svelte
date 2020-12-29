<!-- 
@author Vatroslav Vrbanic | https://github.com/vatro
@component
This is a **svelthree** _AmbientLight_ Component.  
// TODO : Describe in detail.
-->
<script lang="typescript">
    import { onMount } from "svelte"
    import { AmbientLight, Scene } from "svelthree-three"
    import Light from "./Light.svelte"
    import ExposedPropKeys from "../constants/ExposedPropKeys"

    export let scene: Scene

    export let params: ConstructorParameters<typeof AmbientLight> = undefined
    const light = params && params.length > 0 ? new AmbientLight(...params) : new AmbientLight()

    type AmbientLightProps = OnlyExposedAndOverwrittenProps<
        AmbientLight,
        typeof ExposedPropKeys.ambientLight[number],
        { color: THREE.Vector3 | THREE.Color | number | number[] }
    >

    export let props: { [P in keyof AmbientLightProps]: AmbientLightProps[P] } = undefined
    export let color: THREE.Vector3 | THREE.Color | number | number[] = undefined
    export let intensity: number = undefined

    /**
     * @see https://threejs.org/docs/#api/en/lights/AmbientLight
     * AmbientLight cannot be used to cast shadows as it doesn't have a direction.
     * Position is also irrelevant.
     */

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
