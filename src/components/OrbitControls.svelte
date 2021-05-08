<!-- 
@component
This is a **svelthree** _OrbitControls_ Component.  
 TODO  Link to Docs.
-->
<script lang="ts">
	import { onMount } from "svelte"
	import { OrbitControls, Scene } from "svelthree-three"
	import { svelthreeStores } from "../stores"
	import { StoreUtils, SvelthreeProps } from "../utils"

	export let scene: Scene
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

	/*
    $: if($svelthreeStores[sti].orbitcontrols) {
        console.log("run 9!")
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
			console.info(error)
			console.info($svelthreeStores[sti])
			console.info(scene, sti)
		}
	}

	function updateEneableDamping(): void {
		$svelthreeStores[sti].orbitcontrols ? ($svelthreeStores[sti].orbitcontrols.enableDamping = enableDamping) : null
	}

	function updateAutoRotate(): void {
		$svelthreeStores[sti].orbitcontrols ? ($svelthreeStores[sti].orbitcontrols.autoRotate = autoRotate) : null
	}

	onMount(() => {
		console.info("SVELTHREE > onMount : OrbitControls")
		return () => {
			console.info("SVELTHREE > onDestroy : OrbitControls")
		}
	})
</script>
