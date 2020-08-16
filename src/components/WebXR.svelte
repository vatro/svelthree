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
     * -------------------  REAL WORLD Hit Test AR  ----------------------
     * @see https://immersive-web.github.io/hit-test/
     * WebXR Hit Test Module:
     * "Hit testing, as understood by this document, is an act of checking if an idealised
     * mathematical ray (half-line) intersects with real world as understood by the underlying
     * Augmented Reality hardware & software. Ray intersections against virtual objects created
     * by the application consuming the API are explicitly out of scope of the hit test API."
     * 
     * adapted from:
     * @see https://threejs.org/examples/?q=xr#webxr_ar_hittest
     */

    export function performRealWorldHitTest(
        referenceSpace: any = undefined,
        session: any = undefined,
        timestamp: any = undefined,
        frame: any = undefined
    ): void {
        console.info(
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

        /**
         * obtaining and storing hit-test results
         * @see https://immersive-web.github.io/hit-test/#obtaining-hit-test-results
        */

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

    /**
     * Requesting hitTest 
     * @see https://immersive-web.github.io/hit-test/#requesting-hit-test
    */

    function reqHitTestSource(
        referenceSpace: any = undefined,
        session: any = undefined
    ): void {
        /**
         * @see https://immersive-web.github.io/webxr/#xrreferencespace-interface
         */ 
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
