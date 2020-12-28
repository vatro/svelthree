<!-- 
@component
This is a **svelthree** _OrbitControls_ Component.  
// TODO : Describe in detail.
-->
<script lang="typescript">
    /**
     * @author Vatroslav Vrbanic @see https://github.com/vatro
     */

    import { onMount } from "svelte"
    import { svelthreeStores } from "../stores.js"
    import { OrbitControls, Scene } from "svelthree-three"
    import { UniversalPropIterator } from "../utils/UniversalPropIterator.svelte"
    import StoreUtils from "../utils/StoreUtils"

    export let scene: Scene
    export let enableDamping = false
    export let autoRotate = false

    //props object can be filled with anything, ideally available THREE props of course.
    export let props: { [key: string]: any } = undefined

    let ocPropIterator: UniversalPropIterator

    const sti: number = StoreUtils.getSTIfromScene(scene, "Mesh")

    let orbitcontrolsCreated = false

    $: $svelthreeStores[sti].renderer && !orbitcontrolsCreated ? createAndAddOrbitControls() : null

    $: enableDamping || !enableDamping ? updateEneableDamping() : null
    $: autoRotate || !autoRotate ? updateAutoRotate() : null

    $: props
        ? Object.keys(props).length > 0
            ? ocPropIterator
                ? ocPropIterator.tryPropsUpdate(props)
                : null
            : null
        : null

    function createAndAddOrbitControls(): void {
        try {
            $svelthreeStores[sti].orbitcontrols = new OrbitControls(
                $svelthreeStores[sti].activeCamera,
                $svelthreeStores[sti].renderer.domElement
            )

            ocPropIterator = new UniversalPropIterator($svelthreeStores[sti].orbitcontrols)

            $svelthreeStores[sti].orbitcontrols.enableDamping = enableDamping
            $svelthreeStores[sti].orbitcontrols.autoRotate = autoRotate
        } catch (e) {
            console.info(e)
            console.info($svelthreeStores[sti])
            console.info(scene, sti)
        }

        orbitcontrolsCreated = true
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


