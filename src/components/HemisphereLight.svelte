<!-- 
@component
This is a **svelthree** _HemisphereLight_ Component.  
// TODO : Describe in detail.
-->
<script lang="typescript">
    /**
     * @author Vatroslav Vrbanic @see https://github.com/vatro
     */

    import { onMount } from "svelte"
    import { HemisphereLight, HemisphereLightHelper, Scene, Object3D } from "svelthree-three"
    import Light from "./Light.svelte"
    import type { PropColor } from "../utils/SvelthreeTypes"

    export let props: { [key: string]: any } = undefined

    export let parent: Object3D = undefined
    export let name: string = undefined
    export let animation: any = undefined
    export let aniauto: boolean = undefined

    export let groundColor: PropColor = undefined
    export let skyColor: PropColor = undefined
    export let helperSphereSize: number = 0.5
    export let intensity: number = undefined

    // TODO : reconsider(?) --> inconsistency: props object should always overwrite shorthand props.
    $: if (groundColor && skyColor) {
        if (props === undefined) {
            props = { groundColor: groundColor, color: skyColor }
        } else {
            props = { ...props, groundColor: groundColor, color: skyColor }
        }
    }

    /**
     * @see https://threejs.org/docs/#api/en/lights/HemisphereLight
     * HemisphereLight cannot be used to cast shadows.
     * Position is set equal to Object3D.DefaultUp (0, 1, 0), so that the light shines from the top down.
     */

    export let scene: Scene

    let light = new HemisphereLight()
    light.name = name

    export let helper = false

    let lightHelper: HemisphereLightHelper
    $: !lightHelper && light && helper ? createHelper() : null

    function createHelper() {
        lightHelper = new HemisphereLightHelper(light, helperSphereSize, "aqua")

        scene.add(lightHelper)
        lightHelper.visible = false
        console.info("SVELTHREE > " + light.type + " : HELPER added!", {
            lightHelper: lightHelper,
            scene: scene,
            total: scene.children.length
        })
    }

    onMount(() => {
        console.info("SVELTHREE > onMount : HemisphereLight")
        return () => {
            console.info("SVELTHREE > onDestroy : HemisphereLight!")
        }
    })

    export function getLight(): HemisphereLight {
        return light
    }

    export function getHelper(): HemisphereLightHelper {
        return lightHelper
    }
</script>

<!-- cannot use {...$$props} see https://github.com/sveltejs/svelte/issues/4993 -->
<!-- TOFIX  as soon as landed (not in 3.24.0), see https://github.com/sveltejs/svelte/pull/5123  -->
<Light {scene} {parent} {light} {props} {intensity} {animation} {aniauto} />
