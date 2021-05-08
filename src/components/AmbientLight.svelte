<!-- 
@component
This is a **svelthree** _AmbientLight_ Component.  
 TODO  Link to Docs.
-->
<script lang="ts">
	/*
     @see https://threejs.org/docs/#api/en/lights/AmbientLight
     AmbientLight cannot be used to cast shadows as it doesn't have a direction.
     Position is also irrelevant.
    */

	import { onMount } from "svelte"
	import { AmbientLight, Color, Scene, Vector3 } from "svelthree-three"
	import { Light } from "../components-internal"
	import type { OnlyWritableNonFunctionPropsOverwritten } from "../types-extra"

	export let scene: Scene

	export let params: ConstructorParameters<typeof AmbientLight> = undefined
	const light = params && params.length > 0 ? new AmbientLight(...params) : new AmbientLight()

	type AmbientLightProps = OnlyWritableNonFunctionPropsOverwritten<
		AmbientLight,
		{ color: Vector3 | Color | number | number[] }
	>

	/** Writable, non-function AmbientLight properties only incl. type-enhanced 'color' property. */
	export let props: { [P in keyof AmbientLightProps]: AmbientLightProps[P] } = undefined
	export let color: Color | string | [r: number, g: number, b: number] | Vector3 = undefined
	export let intensity: number = undefined

	export function getLight(): AmbientLight {
		return light
	}

	onMount(() => {
		console.info("SVELTHREE > onMount : AmbientLight")
		return () => {
			console.info("SVELTHREE > onDestroy : AmbientLight!")
		}
	})
</script>

<Light {scene} {light} {props} {color} {intensity} />
