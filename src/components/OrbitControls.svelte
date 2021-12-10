<!--
`accessors:true` hast to be set per component because of the svelte-language-server bug, otherwise accessors would be falsely detected as missing and highlighted as errors.
svelthree uses svelte-accmod, where accessors are always `true`, regardless of `svelte:options`.  
-->
<svelte:options accessors />

<!-- 
@component
This is a **svelthree** _OrbitControls_ Component.  
 TODO  Link to Docs.
-->
<script lang="ts">
	import { onMount, afterUpdate, beforeUpdate } from "svelte"
	import { get_current_component } from "svelte/internal"
	import type { Scene } from "three"
	import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
	import { svelthreeStores } from "../stores"
	import { StoreUtils, SvelthreeProps } from "../utils"
	import { c_rs, c_lc, c_mau, verbose_mode, get_comp_name } from "../utils/SvelthreeLogger"
	import type { LogLC, LogDEV } from "../utils/SvelthreeLogger"

	const c_name = get_comp_name(get_current_component())
	const verbose: boolean = verbose_mode()

	export let log_all: boolean = false
	export let log_dev: { [P in keyof LogDEV]: LogDEV[P] } = log_all ? { all: true } : undefined
	export let log_rs: boolean = log_all
	export let log_lc: { [P in keyof LogLC]: LogLC[P] } = log_all ? { all: true } : undefined
	export let log_mau: boolean = log_all

	export let scene: Scene
	export let name: string = undefined
	export let enableDamping = false
	export let autoRotate = false

	// props object can be filled with anything, ideally available THREE props of course.

	let sProps: SvelthreeProps
	$: !sProps && orbitcontrols ? (sProps = new SvelthreeProps(orbitcontrols)) : null

	export let props: { [key: string]: any } = undefined

	$: props && sProps ? sProps.update(props) : null

	const sti: number = StoreUtils.getSTIfromScene(scene, "OrbitControls")

	let orbitcontrols: OrbitControls

	$: if ($svelthreeStores[sti].renderer && !orbitcontrols) {
		createAndAddOrbitControls()
	}

	$: enableDamping || !enableDamping ? updateEneableDamping() : null
	$: autoRotate || !autoRotate ? updateAutoRotate() : null

	// TODO  Months later: What?! Remove?
	/*
    $: if($svelthreeStores[sti].orbitcontrols) {
        console.debug("run 9!")
        orbitcontrols = $svelthreeStores[sti].orbitcontrols
    }
    */

	/*
    $: if (props && orbitcontrols) {
        Propeller.update(orbitcontrols, props)
    }
    */

	function createAndAddOrbitControls(): void {
		try {
			$svelthreeStores[sti].orbitcontrols = new OrbitControls(
				$svelthreeStores[sti].activeCamera,
				$svelthreeStores[sti].renderer.domElement
			)

			$svelthreeStores[sti].orbitcontrols.enableDamping = enableDamping
			$svelthreeStores[sti].orbitcontrols.autoRotate = autoRotate

			orbitcontrols = $svelthreeStores[sti].orbitcontrols
		} catch (error) {
			console.error(
				`SVELTHREE > ${c_name} > Ups, something went wrong while trying to create and add OrbitControls!`,
				error,
				$svelthreeStores[sti],
				{ scene, sti }
			)
		}
	}

	function updateEneableDamping(): void {
		$svelthreeStores[sti].orbitcontrols ? ($svelthreeStores[sti].orbitcontrols.enableDamping = enableDamping) : null
	}

	function updateAutoRotate(): void {
		$svelthreeStores[sti].orbitcontrols ? ($svelthreeStores[sti].orbitcontrols.autoRotate = autoRotate) : null
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
