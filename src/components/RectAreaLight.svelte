<!-- 
@component
This is a **svelthree** _RectAreaLight_ Component.  
 TODO  Link to Docs.
-->
<script lang="ts">
	import { onMount } from "svelte"
	import {
		Color,
		Euler,
		Matrix4,
		Object3D,
		Quaternion,
		RectAreaLight,
		RectAreaLightHelper,
		Scene,
		Vector3
	} from "svelthree-three"
	import { Light } from "../components-internal"
	import type { OnlyWritableNonFunctionPropsPlus, PropBlackList, SvelthreeAnimationFunction } from "../types-extra"

	type RectAreaLightProps = OnlyWritableNonFunctionPropsPlus<
		Omit<RectAreaLight, PropBlackList>,
		{
			lookAt: Vector3 | Parameters<Vector3["set"]>
			position?: Vector3 | Parameters<Vector3["set"]>
			rotation?:
				| Euler
				| Parameters<Euler["set"]>
				| Quaternion
				| Parameters<Quaternion["set"]>
				| Vector3
				| Parameters<Vector3["set"]>
			quaternion?: Quaternion | Parameters<Quaternion["set"]>
			matrix?: Matrix4 | Parameters<Matrix4["set"]>
		}
	>

	export let props: { [P in keyof RectAreaLightProps]: RectAreaLightProps[P] } = undefined

	export let parent: Object3D = undefined
	export let name: string = undefined

	export let animation: SvelthreeAnimationFunction = undefined
	export let aniauto: boolean = undefined

	/*
     @see https://threejs.org/docs/#api/en/lights/RectAreaLight
     Important Notes:
     - There is no shadow support.
     - Only MeshStandardMaterial and MeshPhysicalMaterial are supported.
     - You have to include RectAreaLightUniformsLib into your scene and call init().
    */

	export let pos: Vector3 | Parameters<Vector3["set"]> = undefined
	export let rot:
		| Euler
		| Parameters<Euler["set"]>
		| Quaternion
		| Parameters<Quaternion["set"]>
		| Vector3
		| Parameters<Vector3["set"]> = undefined
	export let quat: Quaternion = undefined

	export let lookAt: Vector3 | Parameters<Vector3["set"]> | Object3D = undefined

	/**
	 * ☝️ If `matrix` attribute is provided, `pos`, `rot`, `scale` attributes as well as any provided transform props will be overridden!
	 */
	export let matrix: Matrix4 | Parameters<Matrix4["set"]> = undefined

	export let color: Color | string | [r: number, g: number, b: number] | Vector3 = undefined
	export let intensity: number = undefined

	export let scene: Scene

	let light: RectAreaLight = new RectAreaLight()
	light.name = name

	export let helper: boolean = undefined

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

	// public methods

	export function getLight(): RectAreaLight {
		return light
	}

	export function getHelper(): RectAreaLightHelper {
		return lightHelper
	}
</script>

<Light
	{scene}
	{parent}
	{light}
	{props}
	{pos}
	{rot}
	{quat}
	{lookAt}
	{matrix}
	{color}
	{intensity}
	{animation}
	{aniauto} />
