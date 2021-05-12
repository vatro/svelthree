<script lang="ts">
	import { onMount } from "svelte"
	import type {
		DirectionalLightHelper,
		HemisphereLightHelper,
		Light,
		PointLightHelper,
		Scene,
		SpotLightHelper
	} from "three"
	import type { RectAreaLightHelper } from "three/examples/jsm/helpers/RectAreaLightHelper"

	type LightHelper =
		| DirectionalLightHelper
		| HemisphereLightHelper
		| PointLightHelper
		| SpotLightHelper
		| RectAreaLightHelper

	export let scene: Scene
	export let helper: boolean
	export let light: Light
	export let lightHelper: LightHelper

	$: lightHelper && light ? startUpdatingHelperOnCreation() : null

	$: lightHelper && light && !helper ? removeHelper() : null

	// $: lightHelper && light ? (lightHelper.matrixAutoUpdate = light.matrixAutoUpdate, console.warn("SVELTHREE > SvelthreeLightHelper, matrixAutoUpdate CHANGE! --> light.matrixAutoUpdate:", light.matrixAutoUpdate)) : null

	export function removeHelper(): void {
		stopHelperUpdating()
		scene.remove(lightHelper)
		lightHelper = undefined
		//console.log("SVELTHREE > SvelthreeLightHelper > " + light.type + " HELPER removed!")
	}

	let doUpdateHelper = false
	let updateHelper_rAF = 0

	function startUpdatingHelperOnCreation(): void {
		startHelperUpdating()
	}

	export function startHelperUpdating(): void {
		//console.log("SVELTHREE > SvelthreeLightHelper > " + light.type + " startHelperUpdating!")
		if (!doUpdateHelper) {
			console.warn(
				"SVELTHREE > SvelthreeLightHelper > startHelperUpdating > lightHelper.matrixAutoUpdate:",
				lightHelper.matrixAutoUpdate
			)
			console.warn(
				"SVELTHREE > SvelthreeLightHelper > startHelperUpdating > light.matrixAutoUpdate:",
				light.matrixAutoUpdate
			)
			doUpdateHelper = true
			updateHelper_rAF = requestAnimationFrame(updateHelper)
		}
	}

	export function stopHelperUpdating(): void {
		//console.log("SVELTHREE > SvelthreeLightHelper > " + light.type + " stopHelperUpdating!")
		if (doUpdateHelper) {
			doUpdateHelper = false
			cancelAnimationFrame(updateHelper_rAF)
		}
	}

	function updateHelper(): void {
		if (doUpdateHelper) {
			if (lightHelper) {
				//console.log("SVELTHREE > SvelthreeLightHelper > " + light.type + " updateHelper!")
				lightHelper.updateMatrixWorld()
				updateHelper_rAF = requestAnimationFrame(updateHelper)
			}
		}
	}

	onMount(() => {
		console.info(`SVELTHREE > SvelthreeLightHelper > onMount : ${light.type}`)
		return () => {
			console.info(`SVELTHREE > SvelthreeLightHelper > onDestroy : ${light.type}`)
			if (lightHelper) {
				removeHelper()
			}
		}
	})
</script>
