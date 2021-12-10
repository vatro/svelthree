<!--
`accessors:true` hast to be set per component because of the svelte-language-server bug, otherwise accessors would be falsely detected as missing and highlighted as errors.
svelthree uses svelte-accmod, where accessors are always `true`, regardless of `svelte:options`.  
-->
<svelte:options accessors />

<!-- 
@component
This is a **svelthree** _AmbientLight_ Component.  
 TODO  Link to Docs.
-->
<script context="module" lang="ts">
	export type AmbientLightProps = OnlyWritableNonFunctionPropsOverwritten<
		AmbientLight,
		{ color: Vector3 | Color | number | number[] }
	>
</script>

<script lang="ts">
	/*
     @see https://threejs.org/docs/#api/en/lights/AmbientLight
     AmbientLight cannot be used to cast shadows as it doesn't have a direction.
     Position is also irrelevant.
    */

	import { onMount, beforeUpdate, afterUpdate } from "svelte"
	import { get_current_component } from "svelte/internal"
	import { AmbientLight, Color, Scene, Vector3 } from "three"
	import { Light } from "../components-internal"
	import type { OnlyWritableNonFunctionPropsOverwritten } from "../types-extra"
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

	export let scene: Scene
	export let name: string = undefined

	export let params: ConstructorParameters<typeof AmbientLight> = undefined
	const light = params && params.length > 0 ? new AmbientLight(...params) : new AmbientLight()
	light.name = name
	light.userData.svelthreeComponent = self

	/** Writable, non-function AmbientLight properties only incl. type-enhanced 'color' property. */
	export let props: { [P in keyof AmbientLightProps]: AmbientLightProps[P] } = undefined
	export let color: Color | string | [r: number, g: number, b: number] | Vector3 = undefined
	export let intensity: number = undefined

	export function getLight(): AmbientLight {
		return light
	}

	onMount(() => {
		if (verbose && log_lc && (log_lc.all || log_lc.om)) console.info(...c_lc(c_name, "onMount"))
		return () => {
			if (verbose && log_lc && (log_lc.all || log_lc.od)) console.info(...c_lc(c_name, "onDestroy"))
		}
	})

	beforeUpdate(() => {
		if (verbose && log_lc && (log_lc.all || log_lc.bu)) console.info(...c_lc(c_name, "beforeUpdate"))
	})

	afterUpdate(() => {
		if (verbose && log_lc && (log_lc.all || log_lc.au)) console.info(...c_lc(c_name, "afterUpdate"))
	})
</script>

<Light {scene} {light} {props} {color} {intensity} {log_dev} {log_rs} {log_lc} {log_mau} />
