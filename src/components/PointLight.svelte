<script lang="typescript">
    /**
     * @author Vatroslav Vrbanic @see https://github.com/vatro
     */

    import {
        PointLight,
        PointLightHelper,
        Scene,
        Object3D
    } from "svelthree-three"
    import Light from "./Light.svelte"
    import { onMount } from "svelte"
    import type { PropPos, PropColor } from "../utils/Sv3Types.svelte"

    //props object can be filled with anything, ideally available THREE props of course.
    export let props: { [key: string]: any } = undefined

    export let parent: Object3D = undefined
    export let name: string = undefined
    export let animation: any = undefined
    export let aniauto: boolean = undefined

    export let pos: PropPos = undefined
    export let color: PropColor = undefined
    export let intensity: number = undefined
    export let shadowMapSize: number = undefined
    export let shadowBias: number = undefined
    export let castShadow = false
    export let scene: Scene

    let light: PointLight = new PointLight()
    light.name = name

    export let helper = false

    let lightHelper: PointLightHelper
    $: !lightHelper && light && helper ? createHelper() : null

    function createHelper() {
        lightHelper = new PointLightHelper(light, 0.1, "aqua")
        scene.add(lightHelper)
        lightHelper.visible = true
        console.info("SVELTHREE > " + light.type + " : HELPER added!", {
            lightHelper: lightHelper,
            scene: scene,
            total: scene.children.length
        })
    }

    onMount(() => {
        console.info("SVELTHREE > onMount : " + light.type)
        return () => {
            console.info("SVELTHREE > onDestroy : " + light.type)
        }
    })

    /**
     * Public methods
     */

    export function getLight(): PointLight {
        return light
    }

    export function getHelper(): PointLightHelper {
        return lightHelper
    }
</script>

<!-- cannot use {...$$props} see https://github.com/sveltejs/svelte/issues/4993 -->
<!-- TOFIX  as soon as landed (not in 3.24.0), see https://github.com/sveltejs/svelte/pull/5123  -->
<Light
    {scene}
    {parent}
    {light}
    {props}
    {pos}
    {color}
    {intensity}
    {shadowMapSize}
    {shadowBias}
    {castShadow}
    {animation}
    {aniauto} />
