<!--
`accessors:true` hast to be set per component because of the svelte-language-server bug, otherwise accessors would be falsely detected as missing and highlighted as errors.
svelthree uses svelte-accmod, where accessors are always `true`, regardless of `svelte:options`.  
-->
<svelte:options accessors />

<script lang="ts">
	import { onMount, beforeUpdate, afterUpdate } from "svelte"
	import { get_current_component } from "svelte/internal"
	import type { CameraHelper, OrthographicCamera, PerspectiveCamera, Scene } from "three"
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
	export let cam: OrthographicCamera | PerspectiveCamera
	export let camHelper: CameraHelper

	$: camHelper && cam ? startUpdatingHelperOnCreation() : null

	$: camHelper && cam && !helper ? removeHelper() : null

	//$: camHelper && cam ? (camHelper.matrixAutoUpdate = cam.matrixAutoUpdate, console.warn("SVELTHREE > SvelthreeCamHelper, matrixAutoUpdate CHANGE! --> cam.matrixAutoUpdate:", cam.matrixAutoUpdate)) : null

	export function removeHelper(): void {
		stopHelperUpdating()
		scene.remove(camHelper)
		camHelper = undefined
		//if (verbose && log_dev) console.debug(...c_dev(c_name, `[${cam.type}] HELPER removed!`))
	}

	let doUpdateHelper = false
	let updateHelper_rAF = 0

	function startUpdatingHelperOnCreation(): void {
		//startHelperUpdating()
	}

	export function startHelperUpdating(): void {
		//if (verbose && log_dev) console.debug(...c_dev(c_name, `[${cam.type}] startHelperUpdating!`))
		/*
        if (!doUpdateHelper) {
			if (verbose && log_dev) console.debug(...c_dev(c_name, `[${cam.type}] startHelperUpdating > camHelper.matrixAutoUpdate:`, camHelper.matrixAutoUpdate))
			if (verbose && log_dev) console.debug(...c_dev(c_name, `[${cam.type}] startHelperUpdating > cam.matrixAutoUpdate:`, cam.matrixAutoUpdate))
            doUpdateHelper = true
            updateHelper_rAF = requestAnimationFrame(updateHelper)
        }
        */
	}

	export function stopHelperUpdating(): void {
		//if (verbose && log_dev) console.debug(...c_dev(c_name, `[${cam.type}] stopHelperUpdating!`))
		if (doUpdateHelper) {
			doUpdateHelper = false
			cancelAnimationFrame(updateHelper_rAF)
		}
	}

	function updateHelper(): void {
		if (doUpdateHelper) {
			if (camHelper) {
				//if (verbose && log_dev) console.debug(...c_dev(c_name, `[${cam.type}] updateHelper!`))
				camHelper.update()
				debugger
				updateHelper_rAF = requestAnimationFrame(updateHelper)
			}
		}
	}

	onMount(() => {
		if (verbose && log_lc && (log_lc.all || log_lc.om)) console.info(...c_lc_int(c_name, `[${cam.type}] onMount`))
		return () => {
			if (verbose && log_lc) console.info(...c_lc_int(c_name, `[${cam.type}] onDestroy`))
			if (camHelper) {
				removeHelper()
			}
		}
	})

	beforeUpdate(() => {
		if (verbose && log_lc) console.info(...c_lc_int(c_name, `[${cam.type}] beforeUpdate`))
	})

	afterUpdate(() => {
		if (verbose && log_lc) console.info(...c_lc_int(c_name, `[${cam.type}] afterUpdate`))
	})
</script>
