<script lang="typescript">
    /**
     * @author Vatroslav Vrbanic @see https://github.com/vatro
     */

    import { onMount } from "svelte"
    import { svelthreeStores } from "../stores.js"
    import { OrbitControls, Scene } from "svelthree-three"
    import { UniversalPropIterator } from "../utils/UniversalPropIterator.svelte"

    export let scene: Scene
    export let enableDamping = false
    export let autoRotate = false

    //props object can be filled with anything, ideally available THREE props of course.
    export let props: { [key: string]: any } = undefined

    let ocPropIterator: UniversalPropIterator

    let sti: number

    if (scene) {
        if (scene.type === "Scene") {
            setSTI()
        } else {
            console.warn(
                "SVELTHREE > OrbitControls : You have to provide a valid 'scene' prop of type 'Scene'!",
                { scene: scene }
            )
            throw new Error("SVELTHREE Exception (see warning above)")
        }
    } else {
        console.warn(
            "SVELTHREE > OrbitControls : You have to provide a {scene} prop!",
            { scene: scene }
        )
        throw new Error("SVELTHREE Exception (see warning above)")
    }

    let orbitcontrolsCreated = false

    $: $svelthreeStores[sti].renderer && !orbitcontrolsCreated
        ? createAndAddOrbitControls()
        : null

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

            ocPropIterator = new UniversalPropIterator(
                $svelthreeStores[sti].orbitcontrols
            )

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
        $svelthreeStores[sti].orbitcontrols
            ? ($svelthreeStores[
                  sti
              ].orbitcontrols.enableDamping = enableDamping)
            : null
    }

    function updateAutoRotate(): void {
        $svelthreeStores[sti].orbitcontrols
            ? ($svelthreeStores[sti].orbitcontrols.autoRotate = autoRotate)
            : null
    }

    function setSTI() {
        if (scene.userData.sti >= 0) {
            sti = scene.userData.sti
        } else {
            console.warn(
                "SVELTHREE > OrbitControls : Failed to set 'sti' from 'scene.userData.sti', 'sti' has to be >= 0!",
                {
                    scene: scene,
                    userData: scene.userData,
                    sti: scene.userData.sti
                }
            )
            throw new Error("SVELTHREE Exception (see warning above)")
        }
    }

    onMount(() => {
        console.info("SVELTHREE > onMount : OrbitControls")
        return () => {
            console.info("SVELTHREE > onDestroy : OrbitControls")
        }
    })
</script>
