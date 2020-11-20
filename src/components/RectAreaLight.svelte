<script lang="typescript">
    /**
     * @author Vatroslav Vrbanic @see https://github.com/vatro
     */

    import {
        RectAreaLight,
        RectAreaLightHelper,
        Scene,
        Object3D
    } from "svelthree-three"
    import Light from "./Light.svelte"
    import { onMount } from "svelte"
    import type { PropPos, PropColor } from "../utils/SvelthreeTypes.svelte"

    //props object can be filled with anything, ideally available THREE props of course.
    export let props: { [key: string]: any } = undefined

    export let parent: Object3D = undefined
    export let name: string = undefined
    export let animation: any = undefined
    export let aniauto: boolean = undefined

    /*
     * @see https://threejs.org/docs/#api/en/lights/RectAreaLight
     * Important Notes:
     * - There is no shadow support.
     * - Only MeshStandardMaterial and MeshPhysicalMaterial are supported.
     * - You have to include RectAreaLightUniformsLib into your scene and call init().
     */

    export let pos: PropPos = undefined
    export let color: PropColor = undefined
    export let intensity: number = undefined
    export let scene: Scene

    let light: RectAreaLight = new RectAreaLight()
    light.name = name

    export let helper = false

    let lightHelper: RectAreaLightHelper
    $: !lightHelper && light && helper ? createHelper() : null

    function createHelper() {
        lightHelper = new RectAreaLightHelper(light, "aqua")

        // RectAreaLightHelper must be added as a child of the light
        light.add(lightHelper)
        lightHelper.visible = false
        console.info("SVELTHREE > " + light.type + " : HELPER added!", {
            lightHelper: lightHelper,
            scene: scene,
            total: scene.children.length
        })
    }

    onMount(() => {
        console.info("SVELTHREE > onMount : " + light.type)
        startUpdatingHelper()
        return () => {
            console.info("SVELTHREE > onDestroy : " + light.type)
            stopUpdatingHelper()
        }
    })

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

    export function getLight(): RectAreaLight {
        return light
    }

    export function getHelper(): RectAreaLightHelper {
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
    {animation}
    {aniauto} />
