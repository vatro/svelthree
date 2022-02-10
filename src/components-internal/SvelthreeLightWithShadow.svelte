<!--
`accessors:true` hast to be set per component because of the svelte-language-server bug, otherwise accessors would be falsely detected as missing and highlighted as errors.
svelthree uses svelte-accmod, where accessors are always `true`, regardless of `svelte:options`.  
-->
<svelte:options accessors />

<!-- 
@component
This is an internal _SvelthreeLightWithShadow_ Component.
-->
<script lang="ts">
	import { get_current_component } from "svelte/internal"

	import type { LightWithShadow } from "../types-extra"
	import { PropUtils, SvelthreeProps } from "../utils"
	import { verbose_mode, get_comp_name_int } from "../utils/SvelthreeLogger"
	import type { LogDEV } from "../utils/SvelthreeLogger"

	const c_name = get_comp_name_int(get_current_component())
	const verbose: boolean = verbose_mode()

	export let log_dev: { [P in keyof LogDEV]: LogDEV[P] } = undefined

	export let light: LightWithShadow

	export let shadowMapSize: number = undefined
	export let shadowBias: number = undefined

	export let shadowCameraProps: { [key: string]: any } = undefined
	export let shadowProps: { [key: string]: any } = undefined

	let propsShadowCamera: SvelthreeProps
	let propsShadow: SvelthreeProps

	// Logging shadow props is also controlled by shadow.camera, @see 'src/utils/SvelthreeLogger'
	$: light ? (light.shadow.camera.userData.log_dev = log_dev) : null
	$: light && !propsShadowCamera ? (propsShadowCamera = new SvelthreeProps(light.shadow.camera)) : null
	$: light && !propsShadow ? (propsShadow = new SvelthreeProps(light.shadow)) : null

	$: shadowCameraProps && propsShadowCamera ? propsShadowCamera.update(shadowCameraProps) : null
	$: shadowProps && propsShadow ? propsShadow.update(shadowProps) : null

	/**
	 * 👉 [DirectionalLight.castShadow](https://threejs.org/docs/#api/en/lights/DirectionalLight.castShadow )
	 * *If set to true light will cast dynamic shadows.
	 * 🔺 WARNING: This is expensive and requires tweaking to get shadows looking right.
	 * See the [DirectionalLightShadow](https://threejs.org/docs/#api/en/lights/shadows/DirectionalLightShadow) for details. The default is false."*
	 */
	export let castShadow: boolean = undefined

	$: shadowMapSize ? PropUtils.setShadowMapSize(light, shadowMapSize) : null
	$: shadowBias ? PropUtils.setShadowBias(light, shadowBias) : null
	$: castShadow ? PropUtils.setCastShadow(light, castShadow) : null
</script>

<!-- <SvelthreeProps props={shadowCameraProps} obj={light.shadow.camera} /> -->
<!-- <SvelthreeProps props={shadowProps} obj={light.shadow} /> -->
