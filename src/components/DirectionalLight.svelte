<script lang="typescript">
    /**
     * @author Vatroslav Vrbanic @see https://github.com/vatro
     */

    import {
        DirectionalLight,
        DirectionalLightHelper,
        Scene
    } from "svelthree-three"
    import Light from "./Light.svelte"
    import { onMount } from "svelte"
    import type { PropPos, PropColor } from "../utils/Sv3Types.svelte"

    /**
     *  TODO  keep an eye on the issue:
     * Unfortunately spreading {...$$props} to Child component doesn't work as expected,
     * @see https://discord.com/channels/457912077277855764/506988048375087114/719602785112293376
     * @see https://github.com/sveltejs/svelte/issues/4993
     *  TOFIX  as soon as landed (not in 3.24.0), see https://github.com/sveltejs/svelte/pull/5123
     */

    /**
     * @see https://threejs.org/docs/#api/en/lights/DirectionalLight
     * All Special properties can be passed via 'props'
     * Special property '.target', @see https://threejs.org/docs/#api/en/lights/DirectionalLight.target.
     * Default target-position: [0,0,0]
     */

    //props object can be filled with anything, ideally available THREE props of course.
    export let props: { [key: string]: any } = undefined

    export let pos: PropPos = undefined
    export let color: PropColor = undefined
    export let intensity: number = undefined
    export let shadowMapSize: number = undefined
    export let shadowBias: number = undefined
    export let castShadow: boolean = undefined
    export let scene: Scene

    let light: DirectionalLight = new DirectionalLight()

    export function getLight(): DirectionalLight {
        return light
    }

    export let helper: boolean = undefined

    let lightHelper: DirectionalLightHelper
    $: !lightHelper && light && helper ? createHelper() : null

    onMount(() => {
        console.info("SVELTHREE > onMount : DirectionalLight")
        startUpdatingHelper()
        return () => {
            console.info("SVELTHREE > onDestroy : DirectionalLight")
            stopUpdatingHelper()
        }
    })

    function createHelper(): void {
        lightHelper = new DirectionalLightHelper(light, 0.1, "aqua")
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

    export function getHelper(): DirectionalLightHelper {
        return lightHelper
    }
</script>

<Light
    {scene}
    {light}
    {props}
    {pos}
    {color}
    {intensity}
    {shadowMapSize}
    {shadowBias}
    {castShadow} />
