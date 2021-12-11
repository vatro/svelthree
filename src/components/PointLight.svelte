<!--
`accessors:true` hast to be set per component because of the svelte-language-server bug, otherwise accessors would be falsely detected as missing and highlighted as errors.
svelthree uses svelte-accmod, where accessors are always `true`, regardless of `svelte:options`.  
-->
<svelte:options accessors />

<!-- 
@component
This is a **svelthree** _PointLight_ Component.  
[ tbd ]  Link to Docs.
-->
<script context="module" lang="ts">
	export type PointLightProps = OnlyWritableNonFunctionPropsPlus<
		Omit<PointLight, PropBlackList>,
		{
			//lookAt: Vector3 | Parameters<Vector3["set"]>
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
	import type { LightShadow } from "three"
	import { Color, Euler, Matrix4, Object3D, PointLight, PointLightHelper, Quaternion, Scene, Vector3 } from "three"
	import { Light, SvelthreeLightHelper, SvelthreeLightWithShadow } from "../components-internal"
	import type {
		LightShadowCamProps,
		LightShadowProps,
		OnlyWritableNonFunctionPropsPlus,
		PropBlackList,
		SvelthreeAnimationFunction
	} from "../types-extra"
	import { LightUtils } from "../utils"
	import { c_rs, c_lc, c_mau, verbose_mode, get_comp_name } from "../utils/SvelthreeLogger"
	import type { LogLC, LogDEV } from "../utils/SvelthreeLogger"

	const self = get_current_component()
	const c_name = get_comp_name(self)
	const verbose: boolean = verbose_mode()

	export let log_all: boolean = false
	export let log_dev: { [P in keyof LogDEV]: LogDEV[P] } = log_all ? { all: true } : undefined
	export let log_rs: boolean = log_all
	export let log_lc: { [P in keyof LogLC]: LogLC[P] } = log_all ? { all: true } : undefined
	export let log_mau: boolean = log_all

	export let props: { [P in keyof PointLightProps]: PointLightProps[P] } = undefined
	export let parent: Object3D = undefined
	export let name: string = undefined

	export let animation: SvelthreeAnimationFunction = undefined
	export let aniauto: boolean = undefined

	export let pos: Vector3 | Parameters<Vector3["set"]> = undefined
	export let rot:
		| Euler
		| Parameters<Euler["set"]>
		| Quaternion
		| Parameters<Quaternion["set"]>
		| Vector3
		| Parameters<Vector3["set"]> = undefined
	export let quat: Quaternion = undefined

	/**
	 * ☝️ If `matrix` attribute is provided, `pos`, `rot`, `scale` attributes as well as any provided transform props will be overridden!
	 */
	export let matrix: Matrix4 | Parameters<Matrix4["set"]> = undefined

	export let color: Color | string | [r: number, g: number, b: number] | Vector3 = undefined
	export let intensity: number = undefined
	export let shadowMapSize: number = undefined
	export let shadowBias: number = undefined
	export let castShadow: boolean = undefined

	export let scene: Scene

	let light: PointLight = new PointLight()
	light.name = name
	light.userData.svelthreeComponent = self

	export let shadowProps: { [P in keyof LightShadowProps<LightShadow>]: LightShadowProps<LightShadow>[P] } = undefined

	export let shadowCameraProps: {
		[P in keyof LightShadowCamProps<typeof light.shadow.camera>]: LightShadowCamProps<typeof light.shadow.camera>[P]
	} = undefined

	export let helper: boolean = undefined

	let lightHelperComponent: SvelthreeLightHelper
	let lightHelper: PointLightHelper
	$: !lightHelper && light && helper ? createHelper() : null

	function createHelper(): void {
		lightHelper = new PointLightHelper(light, 0.1, "aqua")
		LightUtils.addHelper(light, scene, lightHelper)
	}

	onMount(() => {
		if (verbose && log_lc && (log_lc.all || log_lc.om)) console.info(...c_lc(c_name, "onMount"))
		return () => {
			if (verbose && log_lc && (log_lc.all || log_lc.od)) console.info(...c_lc(c_name, "onDestroy"))
			if (lightHelper && lightHelperComponent) {
				lightHelperComponent.removeHelper()
			}
		}
	})

	beforeUpdate(() => {
		if (verbose && log_lc && (log_lc.all || log_lc.bu)) console.info(...c_lc(c_name, "beforeUpdate"))
	})

	afterUpdate(() => {
		if (verbose && log_lc && (log_lc.all || log_lc.au)) console.info(...c_lc(c_name, "afterUpdate"))
	})

	// public methods

	export function getLight(): PointLight {
		return light
	}

	export function getHelper(): PointLightHelper {
		return lightHelper
	}

	export function setHelperAttr(enabled: boolean): void {
		helper = enabled
	}

	export function getHelperAttr(): boolean {
		return helper
	}

	export function startUpdatingHelper(): void {
		lightHelperComponent.startHelperUpdating()
	}

	export function stopUpdatingHelper(): void {
		lightHelperComponent.stopHelperUpdating()
	}
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
	{props}
	{pos}
	{rot}
	{quat}
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
{#if helper}
	<SvelthreeLightHelper
		bind:this={lightHelperComponent}
		{scene}
		{helper}
		{light}
		bind:lightHelper
		{log_dev}
		{log_rs}
		{log_lc}
		{log_mau}
	/>
{/if}
