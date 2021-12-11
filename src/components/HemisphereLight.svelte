<!--
`accessors:true` hast to be set per component because of the svelte-language-server bug, otherwise accessors would be falsely detected as missing and highlighted as errors.
svelthree uses svelte-accmod, where accessors are always `true`, regardless of `svelte:options`.  
-->
<svelte:options accessors />

<!-- 
@component
This is a **svelthree** _HemisphereLight_ Component.  
[ tbd ]  Link to Docs.
-->
<script lang="ts">
	/*
     @see https://threejs.org/docs/#api/en/lights/HemisphereLight
     HemisphereLight cannot be used to cast shadows.
     Position is set equal to Object3D.DefaultUp (0, 1, 0), so that the light shines from the top down.
    */

	import { onMount, beforeUpdate, afterUpdate } from "svelte"
	import { get_current_component } from "svelte/internal"
	import { HemisphereLight, HemisphereLightHelper, Object3D, Scene } from "three"
	import { Light } from "../components-internal"
	import type { SvelthreeAnimationFunction } from "../types-extra"
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
	light.userData.svelthreeComponent = self

	export let helper: boolean = undefined

	$: light && !light.userData.helper && helper
		? LightUtils.addHelper(light, scene, new HemisphereLightHelper(light, 1))
		: null
	$: light && light.userData.helper && !helper ? LightUtils.removeHelper(light, scene) : null

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

<Light {scene} {parent} {light} {props} {intensity} {animation} {aniauto} {log_dev} {log_rs} {log_lc} {log_mau} />
