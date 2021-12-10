<!--
`accessors:true` hast to be set per component because of the svelte-language-server bug, otherwise accessors would be falsely detected as missing and highlighted as errors.
svelthree uses svelte-accmod, where accessors are always `true`, regardless of `svelte:options`.  
-->
<svelte:options accessors />

<!-- 
@component
This is a **svelthree** _RectAreaLight_ Component.  
 TODO  Link to Docs.
-->
<script context="module" lang="ts">
	export type RectAreaLightProps = OnlyWritableNonFunctionPropsPlus<
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
</script>

<script lang="ts">
	import { onMount, beforeUpdate, afterUpdate } from "svelte"
	import { get_current_component } from "svelte/internal"
	import { Color, Euler, Matrix4, Object3D, Quaternion, RectAreaLight, Scene, Vector3 } from "three"
	import { RectAreaLightHelper } from "three/examples/jsm/helpers/RectAreaLightHelper"
	import { Light } from "../components-internal"
	import type { OnlyWritableNonFunctionPropsPlus, PropBlackList, SvelthreeAnimationFunction } from "../types-extra"
	import { c_rs, c_lc, c_mau, c_dev, verbose_mode, get_comp_name } from "../utils/SvelthreeLogger"
	import type { LogLC, LogDEV } from "../utils/SvelthreeLogger"

	const self = get_current_component()
	const c_name = get_comp_name(self)
	const verbose: boolean = verbose_mode()

	export let log_all: boolean = false
	export let log_dev: { [P in keyof LogDEV]: LogDEV[P] } = log_all ? { all: true } : undefined
	export let log_rs: boolean = log_all
	export let log_lc: { [P in keyof LogLC]: LogLC[P] } = log_all ? { all: true } : undefined
	export let log_mau: boolean = log_all

	export let props: { [P in keyof RectAreaLightProps]: RectAreaLightProps[P] } = undefined

	export let parent: Object3D = undefined
	export let name: string = undefined

	/**
	 * `matrixAutoUpdate` shorthand attribute.
	 */
	export let mau: boolean = undefined

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
	light.userData.svelthreeComponent = self

	export let helper: boolean = undefined

	let lightHelper: RectAreaLightHelper
	$: !lightHelper && light && helper ? createHelper() : null

	function createHelper() {
		lightHelper = new RectAreaLightHelper(light, "aqua")

		// RectAreaLightHelper must be added as a child of the light
		light.add(lightHelper)
		lightHelper.visible = false

		if (verbose && log_dev) {
			console.debug(
				...c_dev(c_name, `${light.type} HELPER added!`, {
					lightHelper: lightHelper,
					scene: scene,
					total: scene.children.length
				})
			)
		}
	}

	onMount(() => {
		if (verbose && log_lc && (log_lc.all || log_lc.om)) console.info(...c_lc(c_name, "onMount"))
		startUpdatingHelper()
		return () => {
			if (verbose && log_lc && (log_lc.all || log_lc.od)) console.info(...c_lc(c_name, "onDestroy"))
			stopUpdatingHelper()
		}
	})

	beforeUpdate(() => {
		if (verbose && log_lc && (log_lc.all || log_lc.bu)) console.info(...c_lc(c_name, "beforeUpdate"))
	})

	afterUpdate(() => {
		if (verbose && log_lc && (log_lc.all || log_lc.au)) console.info(...c_lc(c_name, "afterUpdate"))
		if (light.matrixWorldNeedsUpdate === false) {
			light.matrixAutoUpdate = mau
		}
		if (verbose && log_mau)
			console.debug(...c_mau(c_name, "afterUpdate : light.matrixAutoUpdate", light.matrixAutoUpdate))
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
			lightHelper ? lightHelper.updateMatrixWorld() : null
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
	{aniauto}
	{log_dev}
	{log_rs}
	{log_lc}
	{log_mau}
/>
