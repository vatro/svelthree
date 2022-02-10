<!--
`accessors:true` hast to be set per component because of the svelte-language-server bug, otherwise accessors would be falsely detected as missing and highlighted as errors.
svelthree uses svelte-accmod, where accessors are always `true`, regardless of `svelte:options`.  
-->
<svelte:options accessors />

<!-- 
@component
This is a **svelthree** _SvelthreeAnimation_ Component.  
[ tbd ]  Link to Docs.
-->
<script lang="ts">
	import { onMount, beforeUpdate, afterUpdate, getContext } from "svelte"
	import { get_current_component } from "svelte/internal"
	import type { Object3D, Scene } from "three"
	import { SvelthreeAnimationManager, SvelthreeAnimationProp } from "../ani"
	import { c_lc_int, verbose_mode, get_comp_name_int } from "../utils/SvelthreeLogger"
	import type { LogLC } from "../utils/SvelthreeLogger"

	const c_name = get_comp_name_int(get_current_component())
	const verbose: boolean = verbose_mode()

	//export let log_dev: { [P in keyof LogDEV]: LogDEV[P] } = undefined
	//export let log_rs: boolean = false
	export let log_lc: { [P in keyof LogLC]: LogLC[P] } = undefined
	//export let log_mau: boolean = false

	export let animationEnabled: boolean = undefined
	export let animation: any = undefined
	export let aniauto: boolean = undefined
	export let obj: Object3D = undefined
	export let scene: Scene = getContext("scene")

	let aniManager: SvelthreeAnimationManager
	$: animation && animationEnabled ? createAnimationManager() : null

	function createAnimationManager() {
		//if (verbose && log_dev) console.debug(...c_dev(c_name, "createAnimationManager!"))

		if (!aniManager) {
			animation = new SvelthreeAnimationProp(animation)
			aniManager = new SvelthreeAnimationManager(animation, aniauto, obj, scene)
		}
	}

	export let currentSceneActive: boolean

	$: if (currentSceneActive) {
		aniManager ? aniManager.handleCurrentSceneStatus(currentSceneActive) : null
	}

	export function getAnimation(): any {
		if (aniManager) {
			return aniManager.getAnimation()
		} else {
			console.error("SVELTHREE > SvelthreeAnimation > destroyAnimation : missing SvelthreeAnimationManager!", {
				aniManager: aniManager
			})
			return undefined
		}
	}

	export function destroyAnimation(): void {
		//if (verbose && log_dev) console.debug(...c_dev(c_name, "destroyAnimation!"))
		if (aniManager) {
			aniManager.destroyAnimation()
		} else {
			if (animation && animationEnabled) {
				console.error(
					"SVELTHREE > SvelthreeAnimation > destroyAnimation : missing SvelthreeAnimationManager!",
					{ aniManager: aniManager }
				)
			}
		}
	}

	export function startAni(): void {
		if (aniManager) {
			aniManager.startAni()
		} else {
			console.error("SVELTHREE > SvelthreeAnimation > destroyAnimation : missing SvelthreeAnimationManager!", {
				aniManager: aniManager
			})
		}
	}

	onMount(() => {
		//if (verbose && log_lc && (log_lc.all || log_lc.om)) console.info(...c_lc_int(c_name, "onMount"))

		return () => {
			//if (verbose && log_lc ) console.info(...c_lc_int(c_name, "onDestroy"))
			destroyAnimation()
		}
	})

	beforeUpdate(() => {
		if (verbose && log_lc && (log_lc.all || log_lc.bu)) console.info(...c_lc_int(c_name, "beforeUpdate"))
	})

	afterUpdate(() => {
		if (verbose && log_lc && (log_lc.all || log_lc.au)) console.info(...c_lc_int(c_name, "afterUpdate"))
	})
</script>
