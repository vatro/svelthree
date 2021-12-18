<!--
`accessors:true` hast to be set per component because of the svelte-language-server bug, otherwise accessors would be falsely detected as missing and highlighted as errors.
svelthree uses svelte-accmod, where accessors are always `true`, regardless of `svelte:options`.  
-->
<svelte:options accessors />

<!-- 
@component
This is a **svelthree** _DirectionalLight_ Component.  
[ tbd ]  Link to Docs.
-->
<script context="module" lang="ts">
	export type DirectionalLightProps = OnlyWritableNonFunctionPropsPlus<
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
</script>

<script lang="ts">
	// #region --- Imports

	import { afterUpdate, beforeUpdate, onMount } from "svelte"
	import type { Color, DirectionalLightShadow, Matrix4, Object3D, Vector3 } from "three"
	import { DirectionalLight, DirectionalLightHelper, Scene } from "three"
	import { Light, SvelthreeLightWithShadow } from "../components-internal"
	import type {
		LightShadowCamProps,
		LightShadowProps,
		OnlyWritableNonFunctionPropsPlus,
		PropBlackList,
		SvelthreeAnimationFunction
	} from "../types-extra"
	import { LightUtils } from "../utils"
	import type { Empty, Mesh } from "."
	import { get_current_component } from "svelte/internal"
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

	// #endregion

	// #region --- Required Attributes

	export let scene: Scene

	// #endregion

	// #region --- Initialization

	let light: DirectionalLight
	light = new DirectionalLight()
	light.userData.svelthreeComponent = self

	$: {
		if (light) {
			light.matrixAutoUpdate = scene.matrixAutoUpdate ? true : false
		}
	}

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

	export let props: { [P in keyof DirectionalLightProps]: DirectionalLightProps[P] } = undefined

	export let pos: Vector3 | Parameters<Vector3["set"]> = undefined

	// EXCLUDED  THREE :Lights with `target` property use the target for rotation calulation!
	//export let rot: never

	// CUSTOM  actually no `lookAt` on DirectionalLight, we're using custom solution!
	export let lookAt: Vector3 | Parameters<Vector3["set"]> | Object3D = undefined

	export let target: Object3D | Empty | Mesh<any> | boolean = undefined

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
		if (verbose && log_rs) console.debug(...c_rs(c_name, "props", props))
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
		if (verbose && log_lc && (log_lc.all || log_lc.om)) console.info(...c_lc(c_name, "onMount"))
		if (verbose && log_mau) {
			console.debug(
				...c_mau(c_name, "onMount : light.", {
					matrixAutoUpdate: light.matrixAutoUpdate,
					matrixWorldNeedsUpdate: light.matrixWorldNeedsUpdate
				})
			)
		}
		return () => {
			if (verbose && log_lc && (log_lc.all || log_lc.od)) console.info(...c_lc(c_name, "onDestroy"))
			LightUtils.removeHelper(light, scene)
		}
	})

	beforeUpdate(() => {
		if (verbose && log_lc && (log_lc.all || log_lc.bu)) console.info(...c_lc(c_name, "beforeUpdate"))
		if (verbose && log_mau) {
			console.debug(
				...c_mau(c_name, "beforeUpdate : light.", {
					matrixAutoUpdate: light.matrixAutoUpdate,
					matrixWorldNeedsUpdate: light.matrixWorldNeedsUpdate
				})
			)
		}
	})

	afterUpdate(() => {
		if (verbose && log_lc && (log_lc.all || log_lc.au)) console.info(...c_lc(c_name, "afterUpdate"))

		if (verbose && log_mau) {
			console.debug(
				...c_mau(c_name, "afterUpdate : light.", {
					matrixAutoUpdate: light.matrixAutoUpdate,
					matrixWorldNeedsUpdate: light.matrixWorldNeedsUpdate
				})
			)
		}

		if (!mau && light?.parent?.constructor === Scene) {
			/*
				if top level object (scene is direct parent), update self and kick off update of all children, no need to
				check for children, updateMatrixWorld() will do it!
			/*

			/*
				if this.matrixWorldNeedsUpdate = false, matrixWorld will be skipped and the
				function will move to checking all children (without forcing, because scene.autoUpdate = false),
				IMPORTANT  remember -> Scene is also an Object3D!.
				The first child object with .matrixWorldNeedsUpdate = true will kick off
				FORCED update of it's children.
					
				see https://github.com/mrdoob/three.js/blob/a43d2386f58ed0929d894923291a0e86909108b3/src/core/Object3D.js#L573-L605
			*/

			/*
				 IMPORTANT  THREE  updateMatrixWorld() sets .matrixWorldNeedsUpdate to `false`
				 IMPORTANT  THREE  Object3D.updateMatrix() sets .matrixWorldNeedsUpdate to `true` but is MOSTLY being
				executed only if matrixAutoUpdate = true, but sometimes it always gets executes,  TODO  nail it down,
				search for 'updateMatrix()' in three source + WRITE IT DOWN!
			*/

			//	Update local and world matrix after all (prop) changes (microtasks) have been applied.
			light.updateMatrix()
			light.updateMatrixWorld()
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
	{target}
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
