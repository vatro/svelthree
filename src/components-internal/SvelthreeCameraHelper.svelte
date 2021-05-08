<script lang="ts">
	import { onMount } from "svelte"
	import type { CameraHelper, OrthographicCamera, PerspectiveCamera, Scene } from "svelthree-three"

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
		//console.log("SVELTHREE > SvelthreeCameraHelper > " + cam.type + " HELPER removed!")
	}

	let doUpdateHelper = false
	let updateHelper_rAF = 0

	function startUpdatingHelperOnCreation(): void {
		//startHelperUpdating()
	}

	export function startHelperUpdating(): void {
		//console.log("SVELTHREE > SvelthreeCameraHelper > " + cam.type + " startHelperUpdating!")
		/*
        if (!doUpdateHelper) {
            console.warn("SVELTHREE > SvelthreeCameraHelper > startHelperUpdating > camHelper.matrixAutoUpdate:", camHelper.matrixAutoUpdate)
            console.warn("SVELTHREE > SvelthreeCameraHelper > startHelperUpdating > cam.matrixAutoUpdate:", cam.matrixAutoUpdate)
            doUpdateHelper = true
            updateHelper_rAF = requestAnimationFrame(updateHelper)
        }
        */
	}

	export function stopHelperUpdating(): void {
		//console.log("SVELTHREE > SvelthreeCameraHelper > " + cam.type + " stopHelperUpdating!")
		if (doUpdateHelper) {
			doUpdateHelper = false
			cancelAnimationFrame(updateHelper_rAF)
		}
	}

	function updateHelper(): void {
		if (doUpdateHelper) {
			if (camHelper) {
				//console.log("SVELTHREE > SvelthreeCameraHelper > " + cam.type + " updateHelper!")
				camHelper.update()
				debugger
				updateHelper_rAF = requestAnimationFrame(updateHelper)
			}
		}
	}

	onMount(() => {
		console.info(`SVELTHREE > SvelthreeCameraHelper > onMount : ${cam.type}`)
		return () => {
			console.info(`SVELTHREE > SvelthreeCameraHelper > onDestroy : ${cam.type}`)
			if (camHelper) {
				removeHelper()
			}
		}
	})
</script>
