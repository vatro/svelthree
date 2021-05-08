<!-- 
@component
This is a **svelthree** _PointLight_ Component.  
 TODO  Link to Docs.
-->
<script lang="ts">
	import { onMount } from "svelte"
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

	type PointLightProps = OnlyWritableNonFunctionPropsPlus<
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
		console.info(`SVELTHREE > onMount : ${light.type}`)
		return () => {
			console.info(`SVELTHREE > onDestroy : ${light.type}`)
			if (lightHelper && lightHelperComponent) {
				lightHelperComponent.removeHelper()
			}
		}
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

<SvelthreeLightWithShadow {light} {shadowMapSize} {shadowBias} {castShadow} {shadowCameraProps} {shadowProps} />
<Light {scene} {parent} {light} {props} {pos} {rot} {quat} {matrix} {color} {intensity} {animation} {aniauto} />
{#if helper}
	<SvelthreeLightHelper bind:this={lightHelperComponent} {scene} {helper} {light} bind:lightHelper />
{/if}
