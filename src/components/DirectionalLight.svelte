<!-- 
@component
This is a **svelthree** _DirectionalLight_ Component.  
 TODO  Link to Docs.
-->
<script lang="ts">
	// #region --- Imports

	import { afterUpdate, beforeUpdate, onMount } from "svelte"
	import type { Color, DirectionalLightShadow, Matrix4, Object3D, Scene, Vector3 } from "three"
	import { DirectionalLight, DirectionalLightHelper } from "three"
	import { Light, SvelthreeLightWithShadow } from "../components-internal"
	import type {
		LightShadowCamProps,
		LightShadowProps,
		OnlyWritableNonFunctionPropsPlus,
		PropBlackList,
		SvelthreeAnimationFunction
	} from "../types-extra"
	import { LightUtils } from "../utils"
	import type { Empty } from "."
	import type { Mesh } from "."

	const css_rs = "color: red;font-weight:bold;"
	const css_ba = "color: blue;font-weight:bold;"
	const css_aa = "color: green;font-weight:bold;"
	export let logInfo: boolean = false
	export let logRS: boolean = false
	export let logLC: boolean = false

	// #endregion

	// #region --- Required Attributes

	export let scene: Scene

	// #endregion

	// #region --- Initialization

	let light: DirectionalLight
	light = new DirectionalLight()

	// #endregion

	// #region --- Optional Attributes

	export let parent: Object3D = undefined
	export let parentForUs: Object3D = undefined
	export let name: string = undefined

	/**
	 * `matrixAutoUpdate` shorthand attribute.
	 */
	export let mau: boolean = undefined

	type DirectionalLightProps = OnlyWritableNonFunctionPropsPlus<
		Omit<DirectionalLight, PropBlackList>,
		{
			// CUSTOM  actually no `lookAt` on DirectionalLight, we're using custom solution!
			lookAt: Vector3 | Parameters<Vector3["set"]> | Object3D

			position?: Vector3 | Parameters<Vector3["set"]>

			// EXCLUDED  THREE :Lights with `target` property use the target for rotation calulation!
			//rotation?: never

			// EXCLUDED  THREE :Lights with `target` property use the target for rotation calulation!
			//quaternion?: never

			// TODO  can I manipulate the matrix?
			matrix?: Matrix4 | Parameters<Matrix4["set"]>
		}
	>

	export let props: { [P in keyof DirectionalLightProps]: DirectionalLightProps[P] } = undefined

	export let pos: Vector3 | Parameters<Vector3["set"]> = undefined

	// EXCLUDED  THREE :Lights with `target` property use the target for rotation calulation!
	//export let rot: never

	// CUSTOM  actually no `lookAt` on DirectionalLight, we're using custom solution!
	export let lookAt: Vector3 | Parameters<Vector3["set"]> | Object3D = undefined

	export let target: Object3D | Empty | Mesh | boolean = undefined

	/**
	 * ☝️ If `matrix` attribute is provided, `pos`, `rot`, `scale` attributes as well as any provided transform props will be overridden!
	 */
	// TODO  can I manipulate the matrix?
	export let matrix: Matrix4 | Parameters<Matrix4["set"]> = undefined

	export let color: Color | string | [r: number, g: number, b: number] | Vector3 = undefined
	export let intensity: number = undefined
	export let shadowMapSize: number = undefined
	export let shadowBias: number = undefined

	/**
	 * 👉 [DirectionalLight.castShadow](https://threejs.org/docs/#api/en/lights/DirectionalLight.castShadow )
	 * *"If set to true light will cast dynamic shadows.
	 * 🔺 WARNING: This is expensive and requires tweaking to get shadows looking right.
	 * See the [DirectionalLightShadow](https://threejs.org/docs/#api/en/lights/shadows/DirectionalLightShadow) for details. The default is false."*
	 */
	export let castShadow: boolean = undefined

	export let shadowProps: {
		[P in keyof LightShadowProps<DirectionalLightShadow>]: LightShadowProps<DirectionalLightShadow>[P]
	} = undefined

	export let shadowCameraProps: {
		[P in keyof LightShadowCamProps<typeof light.shadow.camera>]: LightShadowCamProps<typeof light.shadow.camera>[P]
	} = undefined

	export let helper: boolean = undefined

	// #endregion

	// Helper

	$: light && !light.userData.helper && helper ? addHelper() : null

	function addHelper() {
		if (logRS) console.log("%c--------> DirectionalLight > reactive statement! props", `${css_rs}`, props)
		LightUtils.addHelper(light, scene, new DirectionalLightHelper(light))
	}

	$: light && light.userData.helper && !helper ? removeHelper() : null

	function removeHelper() {
		LightUtils.removeHelper(light, scene)
	}

	// Animation

	export let animation: SvelthreeAnimationFunction = undefined
	export let aniauto: boolean = undefined

	// TODO  PARENTING LOGIC!

	// #region --- Public Methods

	export function getLight(): DirectionalLight {
		return light
	}

	export function getHelper(): DirectionalLightHelper {
		return light.userData.helper as DirectionalLightHelper
	}

	export function setHelperAttr(enabled: boolean): void {
		helper = enabled
	}

	export function getHelperAttr(): boolean {
		return helper
	}

	// #endregion

	// #region --- Lifecycle

	onMount(() => {
		if (logLC) logCurrentState(`----> DirectionalLight > onMount`, null)
		if (logInfo) console.info(`SVELTHREE > onMount : ${light.type}`)
		return () => {
			if (logInfo) console.info(`SVELTHREE > onDestroy : ${light.type}`)
			LightUtils.removeHelper(light, scene)
		}
	})

	beforeUpdate(() => {
		if (logLC) logCurrentState("%c------> DirectionalLight > beforeUpdate", css_ba)
	})

	afterUpdate(() => {
		if (logLC) logCurrentState("%c------> DirectionalLight > afterUpdate", css_aa)
		if (light.matrixWorldNeedsUpdate === false) {
			light.matrixAutoUpdate = mau
		}
	})

	function logCurrentState(prefix: string, css: string) {
		if (logInfo) console.log(`${prefix}!`, `${css}`)
	}

	// #endregion

</script>

<SvelthreeLightWithShadow {light} {shadowMapSize} {shadowBias} {castShadow} {shadowCameraProps} {shadowProps} />
<Light
	{scene}
	{parent}
	{light}
	{mau}
	{helper}
	{props}
	{pos}
	{lookAt}
	{target}
	{matrix}
	{color}
	{intensity}
	{animation}
	{aniauto}
	{logInfo}
	{logRS}
	{logLC} />
