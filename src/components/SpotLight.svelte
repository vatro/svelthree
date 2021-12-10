<!--
`accessors:true` hast to be set per component because of the svelte-language-server bug, otherwise accessors would be falsely detected as missing and highlighted as errors.
svelthree uses svelte-accmod, where accessors are always `true`, regardless of `svelte:options`.  
-->
<svelte:options accessors />

<!-- 
@component
This is a **svelthree** _SpotLight_ Component.  
 TODO  Link to Docs.
-->
<script context="module" lang="ts">
	export type SpotLightProps = OnlyWritableNonFunctionPropsPlus<
		Omit<SpotLight, PropBlackList>,
		{
			// CUSTOM  actually no `lookAt` on SpotlLight, we're using custom solution!
			lookAt: Vector3 | Parameters<Vector3["set"]> | Object3D

			position?: Vector3 | Parameters<Vector3["set"]>

			// EXCLUDED  THREE :Lights with `target` property use the target for rotation calulation!
			//rotation?: never

			// EXCLUDED  THREE :Lights with `target` property use the target for rotation calulation!
			//quaternion?: never

			matrix?: Matrix4 | Parameters<Matrix4["set"]>
		}
	>
</script>

<script lang="ts">
	// #region --- Imports

	import { onMount, beforeUpdate, afterUpdate } from "svelte"
	import { get_current_component } from "svelte/internal"
	import type { Matrix4, SpotLightShadow } from "three"
	import { Color, Object3D, Scene, SpotLight, SpotLightHelper, Vector3 } from "three"
	import { Light, SvelthreeLightWithShadow } from "../components-internal"
	import type {
		LightShadowCamProps,
		LightShadowProps,
		OnlyWritableNonFunctionPropsPlus,
		PropBlackList,
		SvelthreeAnimationFunction
	} from "../types-extra"
	import { LightUtils, PropUtils } from "../utils"
	import { c_rs, c_lc, c_mau, verbose_mode, get_comp_name } from "../utils/SvelthreeLogger"
	import type { LogLC, LogDEV } from "../utils/SvelthreeLogger"

	// #endregion

	const c_name = get_comp_name(get_current_component())
	const verbose: boolean = verbose_mode()

	export let log_all: boolean = false
	export let log_dev: { [P in keyof LogDEV]: LogDEV[P] } = log_all ? { all: true } : undefined
	export let log_rs: boolean = log_all
	export let log_lc: { [P in keyof LogLC]: LogLC[P] } = log_all ? { all: true } : undefined
	export let log_mau: boolean = log_all

	// #region --- Required Attributes

	export let scene: Scene

	// #endregion

	// #region --- Initialization

	let light: SpotLight
	light = new SpotLight()
	light.userData.svelthreeComponent = self

	// #endregion

	// #region --- Optional Attributes

	export let parent: Object3D = undefined
	export let parentForUs: Object3D = undefined
	export let name: string = undefined

	light.name = name

	/**
	 * `matrixAutoUpdate` shorthand attribute.
	 */
	export let mau: boolean = undefined

	export let props: { [P in keyof SpotLightProps]: SpotLightProps[P] } = undefined

	export let pos: Vector3 | Parameters<Vector3["set"]> = undefined

	// EXCLUDED  THREE :Lights with `target` property use the target for rotation calulation!
	//export let rot: never

	// EXCLUDED  THREE :Lights with `target` property use the target for rotation calulation!
	//export let quat: never

	// CUSTOM  actually no `lookAt` on DirectionalLight, we're using custom solution!
	export let lookAt: Vector3 | Parameters<Vector3["set"]> | Object3D = undefined

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
	 * 👉 [SpotLight.castShadow](https://threejs.org/docs/#api/en/lights/SpotLight.castShadow )
	 * *"If set to true light will cast dynamic shadows.
	 * 🔺 WARNING: This is expensive and requires tweaking to get shadows looking right.
	 * See the [SpotLightShadow](https://threejs.org/docs/#api/en/lights/shadows/SpotLightShadow) for details. The default is false."*
	 */
	export let castShadow: boolean = undefined

	export let shadowProps: {
		[P in keyof LightShadowProps<SpotLightShadow>]: LightShadowProps<SpotLightShadow>[P]
	} = undefined

	export let shadowCameraProps: {
		[P in keyof LightShadowCamProps<typeof light.shadow.camera>]: LightShadowCamProps<typeof light.shadow.camera>[P]
	} = undefined

	// SpotLight specific shorthand attributes
	// ☝️ These do not depend on matrix-update, that's why we put them here and not in Light!
	export let angle: number = undefined
	export let decay: number = undefined
	export let distance: number = undefined
	export let penumbra: number = undefined
	export let power: number = undefined

	$: angle ? PropUtils.applyValueToProp(light, angle, "angle") : null
	$: decay ? PropUtils.applyValueToProp(light, decay, "decay") : null
	$: distance ? PropUtils.applyValueToProp(light, distance, "distance") : null
	$: penumbra ? PropUtils.applyValueToProp(light, penumbra, "penumbra") : null
	$: power ? PropUtils.applyValueToProp(light, power, "power") : null

	export let helper: boolean = undefined

	// #endregion

	// Helper

	$: light && !light.userData.helper && helper ? LightUtils.addHelper(light, scene, new SpotLightHelper(light)) : null
	$: light && light.userData.helper && !helper ? LightUtils.removeHelper(light, scene) : null

	// Animation

	export let animation: SvelthreeAnimationFunction = undefined
	export let aniauto: boolean = undefined

	// TODO  PARENTING LOGIC!

	// #region --- Public Methods

	export function getLight(): SpotLight {
		return light
	}

	export function getHelper(): SpotLightHelper {
		return light.userData.helper as SpotLightHelper
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
		if (verbose && log_lc && (log_lc.all || log_lc.om)) console.info(...c_lc(c_name, "onMount"))
		return () => {
			if (verbose && log_lc && (log_lc.all || log_lc.od)) console.info(...c_lc(c_name, "onDestroy"))
			LightUtils.removeHelper(light, scene)
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
		if (verbose && log_mau) {
			console.debug(...c_mau(c_name, "afterUpdate : light.matrixAutoUpdate", light.matrixAutoUpdate))
		}
	})

	// #endregion
</script>

<SvelthreeLightWithShadow
	{light}
	{shadowMapSize}
	{shadowBias}
	{castShadow}
	{shadowCameraProps}
	{shadowProps}
	{log_dev}
	{log_rs}
	{log_lc}
	{log_mau}
/>
<Light
	{scene}
	{parent}
	{light}
	{mau}
	{helper}
	{props}
	{pos}
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
