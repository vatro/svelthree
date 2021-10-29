<script lang="ts">
    /**
     * @author Vatroslav Vrbanic @see https://github.com/vatro
     */

    import {
        SpotLight,
        SpotLightHelper,
        Scene,
        Object3D
    } from "svelthree-three"
    import Light from "./Light.svelte"
    import { onMount } from "svelte"
    import type { PropPos, PropColor } from "../utils/SvelthreeTypes"

    /**
     *  TODO  keep an eye on the issue:
     * Unfortunately spreading {...$$props} to Child component doesn't work as expected,
     * @see https://discord.com/channels/457912077277855764/506988048375087114/719602785112293376
     * @see https://github.com/sveltejs/svelte/issues/4993
     *  TOFIX  as soon as landed (not in 3.24.0), see https://github.com/sveltejs/svelte/pull/5123
     */

    /**
     * @see https://threejs.org/docs/#api/en/lights/SpotLight
     */

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
    export let castShadow: boolean = undefined
    export let scene: Scene

    let light: SpotLight = new SpotLight()
    light.name = name

    export function getLight(): SpotLight {
        return light
    }

    export let helper: boolean = undefined

    let lightHelper: SpotLightHelper
    $: !lightHelper && light && helper ? createHelper() : null

    onMount(() => {
        console.info("SVELTHREE > onMount : SpotLight")
        startUpdatingHelper()
        return () => {
            console.info("SVELTHREE > onDestroy : SpotLight")
            stopUpdatingHelper()
        }
    })

    function createHelper(): void {
        lightHelper = new SpotLightHelper(light, "aqua")
        scene.add(lightHelper)
        lightHelper.visible = false
        console.info("SVELTHREE > " + light.type + " HELPER added!", {
            lightHelper: lightHelper,
            scene: scene,
            total: scene.children.length
        })
    }

    let doUpdateHelper = false
    let updateHelper_rAF = 0

    function startUpdatingHelper(): void {
        doUpdateHelper = true
        updateHelper_rAF = requestAnimationFrame(updateHelper)
    }

    function stopUpdatingHelper(): void {
        doUpdateHelper = false
        cancelAnimationFrame(updateHelper_rAF)
    }

    function updateHelper(): void {
        if (doUpdateHelper) {
            lightHelper ? lightHelper.update() : null
            updateHelper_rAF = requestAnimationFrame(updateHelper)
        }
    }

    /**
     * Public methods
     */

    export function getHelper(): SpotLightHelper {
        return lightHelper
    }
</script>

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
