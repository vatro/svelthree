<!-- 
@component
This is a **svelthree** _HemisphereLight_ Component.  
 TODO  Link to Docs.
-->
<script lang="ts">
	/*
     @see https://threejs.org/docs/#api/en/lights/HemisphereLight
     HemisphereLight cannot be used to cast shadows.
     Position is set equal to Object3D.DefaultUp (0, 1, 0), so that the light shines from the top down.
    */

	import { onMount } from "svelte"
	import { HemisphereLight, HemisphereLightHelper, Object3D, Scene } from "svelthree-three"
	import { Light } from "../components-internal"
	import type { SvelthreeAnimationFunction } from "../types-extra"
	import { LightUtils } from "../utils"

	export let props: { [key: string]: any } = undefined

	export let parent: Object3D = undefined
	export let name: string = undefined

	export let animation: SvelthreeAnimationFunction = undefined
	export let aniauto: boolean = undefined

	export let groundColor: THREE.Vector3 | THREE.Color | number | number[] = undefined
	export let skyColor: THREE.Vector3 | THREE.Color | number | number[] = undefined
	export let helperSphereSize: number = 0.5
	export let intensity: number = undefined

	// TODO  reconsider(?) --> inconsistency: props object should always overwrite shorthand props.
	$: if (groundColor && skyColor) {
		if (props === undefined) {
			props = { groundColor: groundColor, color: skyColor }
		} else {
			props = { ...props, groundColor: groundColor, color: skyColor }
		}
	}

	export let scene: Scene

	let light = new HemisphereLight()
	light.name = name

	export let helper: boolean = undefined

	$: light && !light.userData.helper && helper
		? LightUtils.addHelper(light, scene, new HemisphereLightHelper(light, 1))
		: null
	$: light && light.userData.helper && !helper ? LightUtils.removeHelper(light, scene) : null

	onMount(() => {
		console.info(`SVELTHREE > onMount : ${light.type}`)
		return () => {
			console.info(`SVELTHREE > onDestroy : ${light.type}`)
			LightUtils.removeHelper(light, scene)
		}
	})

	// public methods

	export function getLight(): HemisphereLight {
		return light
	}

	export function getHelper(): HemisphereLightHelper {
		return light.userData.helper as HemisphereLightHelper
	}

	export function setHelperAttr(enabled: boolean): void {
		helper = enabled
	}

	export function getHelperAttr(): boolean {
		return helper
	}
</script>

<Light {scene} {parent} {light} {props} {intensity} {animation} {aniauto} />
