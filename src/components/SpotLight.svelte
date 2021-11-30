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

	import { onMount } from "svelte"
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

	// #endregion

	// #region --- Required Attributes

	export let scene: Scene

	// #endregion

	// #region --- Initialization

	let light: SpotLight
	light = new SpotLight()

	// #endregion

	// #region --- Optional Attributes

	export let parent: Object3D = undefined
	export let parentForUs: Object3D = undefined
	export let name: string = undefined

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
		console.info(`SVELTHREE > onMount : ${light.type}`)
		return () => {
			console.info(`SVELTHREE > onDestroy : ${light.type}`)
			LightUtils.removeHelper(light, scene)
		}
	})

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
	{matrix}
	{color}
	{intensity}
	{animation}
	{aniauto} />
