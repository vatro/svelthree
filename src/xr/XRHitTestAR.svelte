<!-- 
@component
This is a **svelthree** _WebXR_ Component.  
 TODO  Link to Docs.
-->
<script lang="ts">
	import type { XRFrame, XRSession } from "three"

	// TODO  revrite as TS!
	/*
     This component is for internal usage by WebGLRenderer component
    */
	import { svelthreeStores } from "../stores"
	import type { XRHitTestSource, XRReferenceSpace } from "./types-webxr"
	export let sti: number

	/*
     -------------------  REAL WORLD Hit Test AR  ----------------------
     @see https://immersive-web.github.io/hit-test/
     WebXR Hit Test Module:
     "Hit testing, as understood by this document, is an act of checking if an idealised
     mathematical ray (half-line) intersects with real world as understood by the underlying
     Augmented Reality hardware & software. Ray intersections against virtual objects created
     by the application consuming the API are explicitly out of scope of the hit test API."
     
     adapted from:
     @see https://threejs.org/examples/?q=xr#webxr_ar_hittest
    */

	export function performRealWorldHitTest(session: XRSession = undefined, frame: XRFrame = undefined): void {
		/*
         console.info(
            "SVELTHREE > WebXR > performRealWorldHitTest!",
            session,
            frame
         )
        */

		// This is being executed only once
		if ($svelthreeStores[sti].xr.hitTestSourceRequested === false) {
			reqHitTestSource(session)
			$svelthreeStores[sti].xr.hitTestSourceRequested = true
		}

		/*
         obtaining and storing hit-test results
         @see https://immersive-web.github.io/hit-test/#obtaining-hit-test-results
        */

		if ($svelthreeStores[sti].xr.hitTestSource) {
			let results = frame.getHitTestResults($svelthreeStores[sti].xr.hitTestSource)
			$svelthreeStores[sti].xr.hitTestResults = results
			/*
             console.info(
                "SVELTHREE > WebXR > performRealWorldHitTest! $svelthreeStores[sti].xr.hitTestResults:",
                $svelthreeStores[sti].xr.hitTestResults
             )
            */
		}
	}

	/*
     Requesting hitTest
     @see https://immersive-web.github.io/hit-test/#requesting-hit-test
     @see https://immersive-web.github.io/webxr/#dom-xrsession-requestreferencespace
     @see https://immersive-web.github.io/hit-test/#dom-xrsession-requesthittestsource
     @see https://immersive-web.github.io/hit-test/#create-a-hit-test-source
    */
	function reqHitTestSource(session: XRSession = undefined): void {
		session.requestReferenceSpace("viewer").then(function (referenceSpace: XRReferenceSpace) {
			session
				.requestHitTestSource({
					space: referenceSpace
				})
				.then(function (source: XRHitTestSource) {
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

</script>
