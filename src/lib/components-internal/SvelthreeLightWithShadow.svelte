<!-- 
@component
This is an internal _SvelthreeLightWithShadow_ Component.
-->
<script lang="ts">
	import type { LightWithShadow } from "../types/types-extra.js"
	import { PropUtils, SvelthreeProps } from "../utils/index.js"
	import type { LogDEV } from "../utils/SvelthreeLogger.js"
	import type {
		PropsPerspectiveCamera,
		PropsOrthographicCamera,
		PropsDirectionalLightShadow,
		PropsPointLightShadow,
		PropsSpotLightShadow
	} from "../types/types-comp-props.js"

	export let log_dev: { [P in keyof LogDEV]: LogDEV[P] } | undefined = undefined

	export let light: LightWithShadow | null | undefined

	export let shadowMapSize: number | undefined = undefined
	export let shadowBias: number | undefined = undefined

	export let shadowCameraProps: PropsPerspectiveCamera | PropsOrthographicCamera | undefined = undefined
	export let shadowProps: PropsDirectionalLightShadow | PropsPointLightShadow | PropsSpotLightShadow | undefined =
		undefined

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
	export let castShadow: boolean | undefined = undefined

	$: shadowMapSize ? PropUtils.setShadowMapSize(light, shadowMapSize) : null
	$: shadowBias ? PropUtils.setShadowBias(light, shadowBias) : null
	$: castShadow ? PropUtils.setCastShadow(light, castShadow) : null
</script>
