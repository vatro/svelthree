<script lang="typescript">
    /**
     * @author Vatroslav Vrbanic @see https://github.com/vatro
     */
    /**
     * This component is for internal usage by WebGLRenderer component
     */
    import { svelthreeStores } from "../stores.js"
    export let sti: number

    /**
     * -------------------  Hit Test AR  ----------------------
     * @see https://threejs.org/examples/?q=xr#webxr_ar_hittest
     */

    export function performHitTest(
        referenceSpace: any = undefined,
        session: any = undefined,
        timestamp: any = undefined,
        frame: any = undefined
    ): void {
        console.log(
            "SVELTHREE > WebXR > performHitTest!",
            referenceSpace,
            session,
            frame
        )
        // request hit-test source
        if ($svelthreeStores[sti].xr.hitTestSourceRequested === false) {
            reqHitTestSource(referenceSpace, session)
            $svelthreeStores[sti].xr.hitTestSourceRequested = true
        }

        // store hit-test results
        if ($svelthreeStores[sti].xr.hitTestSource) {
            let results = frame.getHitTestResults(
                $svelthreeStores[sti].xr.hitTestSource
            )

            $svelthreeStores[sti].xr.hitTestResults = results
            console.info(
                "SVELTHREE > WebXR > performHitTest! $svelthreeStores[sti].xr.hitTestResults:",
                $svelthreeStores[sti].xr.hitTestResults
            )
        }
    }

    function reqHitTestSource(
        referenceSpace: any = undefined,
        session: any = undefined
    ): void {
        session.requestReferenceSpace("viewer").then(function (referenceSpace) {
            session
                .requestHitTestSource({
                    space: referenceSpace
                })
                .then(function (source) {
                    $svelthreeStores[sti].xr.hitTestSource = source
                })
        })

        session.addEventListener("end", function () {
            resetHitTestSource()
        })
    }

    function resetHitTestSource(): void {
        $svelthreeStores[sti].xr.hitTestSourceRequested = false
        $svelthreeStores[sti].xr.hitTestSource = null
    }

    // --------------------------------------------------------------
</script>
