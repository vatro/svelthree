<!--
`accessors:true` hast to be set per component because of the svelte-language-server bug, otherwise accessors would be falsely detected as missing and highlighted as errors.
svelthree uses svelte-accmod, where accessors are always `true`, regardless of `svelte:options`.  
-->
<svelte:options accessors />

<script context="module" lang="ts">
	export type LightHelper =
		| DirectionalLightHelper
		| HemisphereLightHelper
		| PointLightHelper
		| SpotLightHelper
		| RectAreaLightHelper
</script>

<script lang="ts">
	import { onMount, beforeUpdate, afterUpdate } from "svelte"
	import { get_current_component } from "svelte/internal"
	import type {
		DirectionalLightHelper,
		HemisphereLightHelper,
		Light,
		PointLightHelper,
		Scene,
		SpotLightHelper
	} from "three"
	import type { RectAreaLightHelper } from "three/examples/jsm/helpers/RectAreaLightHelper"
	import { c_rs_int, c_dev, c_lc_int, c_mau, verbose_mode, get_comp_name_int } from "../utils/SvelthreeLogger"
	import type { LogLC, LogDEV } from "../utils/SvelthreeLogger"

	const c_name = get_comp_name_int(get_current_component())
	const verbose: boolean = verbose_mode()

	export let log_dev: { [P in keyof LogDEV]: LogDEV[P] } = undefined
	export let log_rs: boolean = false
	export let log_lc: { [P in keyof LogLC]: LogLC[P] } = undefined
	export let log_mau: boolean = false

	export let scene: Scene
	export let helper: boolean
	export let light: Light
	export let lightHelper: LightHelper

	$: lightHelper && light ? startUpdatingHelperOnCreation() : null

	$: lightHelper && light && !helper ? removeHelper() : null

	// TODO  mau
	// $: lightHelper && light ? (lightHelper.matrixAutoUpdate = light.matrixAutoUpdate, console.warn("SVELTHREE > SvelthreeLightHelper, matrixAutoUpdate CHANGE! --> light.matrixAutoUpdate:", light.matrixAutoUpdate)) : null

	export function removeHelper(): void {
		stopHelperUpdating()
		scene.remove(lightHelper)
		lightHelper = undefined
		//if (verbose && log_rs) console.debug(...c_rs_int(c_name, `[${light.type}] HELPER removed!`))
	}

	let doUpdateHelper = false
	let updateHelper_rAF = 0

	function startUpdatingHelperOnCreation(): void {
		startHelperUpdating()
	}

	export function startHelperUpdating(): void {
		//if (verbose && log_rs) console.debug(...c_rs_int(c_name, `[${light.type}] startUpdatingHelperOnCreation > startHelperUpdating!`))

		// TODO  mau
		if (!doUpdateHelper) {
			if (verbose && log_mau)
				console.debug(
					...c_mau(
						c_name,
						`[${light.type}] startHelperUpdating > lightHelper.matrixAutoUpdate:`,
						lightHelper.matrixAutoUpdate
					)
				)
			if (verbose && log_mau)
				console.debug(
					...c_mau(
						c_name,
						`[${light.type}] startHelperUpdating > light.matrixAutoUpdate:`,
						light.matrixAutoUpdate
					)
				)
			doUpdateHelper = true
			updateHelper_rAF = requestAnimationFrame(updateHelper)
		}
	}

	export function stopHelperUpdating(): void {
		//if (verbose && log_rs) console.debug(...c_rs_int(c_name, `[${light.type}] removeHelper > stopHelperUpdating!`))
		if (doUpdateHelper) {
			doUpdateHelper = false
			cancelAnimationFrame(updateHelper_rAF)
		}
	}

	function updateHelper(): void {
		if (doUpdateHelper) {
			if (lightHelper) {
				//if (verbose && log_rs) console.debug(...c_rs_int(c_name, `[${light.type}] updateHelper_rAF -> updateHelper!`))
				lightHelper.updateMatrixWorld()
				updateHelper_rAF = requestAnimationFrame(updateHelper)
			}
		}
	}

	onMount(() => {
		if (verbose && log_lc && (log_lc.all || log_lc.om)) console.info(...c_lc_int(c_name, `[${light.type}] onMount`))
		return () => {
			if (verbose && log_lc) console.info(...c_lc_int(c_name, `[${light.type}] onDestroy`))
			if (lightHelper) {
				removeHelper()
			}
		}
	})

	beforeUpdate(() => {
		if (verbose && log_lc && (log_lc.all || log_lc.bu)) console.info(...c_lc_int(c_name, "beforeUpdate"))
	})

	afterUpdate(() => {
		if (verbose && log_lc && (log_lc.all || log_lc.au)) console.info(...c_lc_int(c_name, "afterUpdate"))
	})
</script>
