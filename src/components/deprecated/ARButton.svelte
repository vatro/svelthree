<script lang="typescript">
    /**
     * @author Vatroslav Vrbanic @see https://github.com/vatro
     */

    import { onMount } from "svelte"
    import { svelthreeStores } from "../../stores.js"
    import { ARButton, Group } from "svelthree-three"
    import { createEventDispatcher } from "svelte"

    let dispatch: (type: string, detail?: any) => void = createEventDispatcher()

    export let requiredFeatures: string[] = undefined

    export let sti: number

    if (sti === undefined) {
        console.warn(
            "SVELTHREE > ARButton : You have to provide a {sti} prop for the ARButton!",
            { sti: sti }
        )
        throw new Error("SVELTHREE Exception (see warning above)")
    }

    $: requiredFeatures ? (console.warn("REACTIVE! $svelthreeStores[sti].xr.requiredFeatures"), updateRequiredFeatures()) : null
    
    function updateRequiredFeatures() {
        $svelthreeStores[sti].xr.requiredFeatures = [...requiredFeatures]
    }

    let arButtonAdded: boolean = false
    $: if (
        $svelthreeStores[sti].renderer &&
        $svelthreeStores[sti].xr.reticle &&
        !arButtonAdded
    ) {
        addButtonToBody()
        $svelthreeStores[sti].xr.sessionMode = "immersive-ar"
        arButtonAdded = true
    }

    // set xr controller
    $: $svelthreeStores[sti].renderer
        ? ($svelthreeStores[sti].xr.controller = $svelthreeStores[
              sti
          ].renderer.xr.getController(0))
        : null

    $: if (
        $svelthreeStores[sti].xr.controller &&
        $svelthreeStores[sti].xr.requiredFeatures
    ) {
        if (
            $svelthreeStores[sti].xr.requiredFeatures.indexOf("hit-test") > -1
        ) {
            $svelthreeStores[sti].xr.controller.addEventListener(
                "select",
                onSelect
            )
        }
    }

    function onSelect(): void {
        if (
            $svelthreeStores[sti].xr.reticle &&
            $svelthreeStores[sti].xr.reticle.visible
        ) {
            dispatch("select", {
                reticleMatrix: $svelthreeStores[sti].xr.reticle.matrix
            })
        }
    }

    onMount(() => {
        console.info("SVELTHREE > onMount : ARButton")
    })

    function addButtonToBody() {
        console.info("SVELTHREE > ARButton : addButtonToBody")
        document.body.appendChild(
            ARButton.createButton($svelthreeStores[sti].renderer, {
                requiredFeatures: $svelthreeStores[sti].xr.requiredFeatures
            })
        )
    }
</script>
