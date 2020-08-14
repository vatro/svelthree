<script lang="typescript">
    /**
     * @author Vatroslav Vrbanic @see https://github.com/vatro
     */
    /**
     * This is basically an adaption of the three.js AR hittest example
     * @see https://threejs.org/examples/?q=XR#webxr_ar_hittest
     * I named it SessionXR and not SessionAR, because I hope I can reuse / extend
     * it for VR, so that we have one component for the basic AR / VR session configuration.
     * The threejs example doesn't use the 'dom-overlay' feature (like here), the
     * "START AR" / "STOP AR" button was gone after starting the session. This doesn't happen now.
     *  TODO : contribute to three.js (change ARButton so it uses the 'dom-overlay' feature)
     */
    import { onMount } from "svelte"
    import { svelthreeStores } from "../stores.js"
    import { createEventDispatcher } from "svelte"
    import { Object3D, Scene } from "svelthree-three"

    let dispatch: (type: string, detail?: any) => void = createEventDispatcher()

    export let scene: Scene
    let sti: number

    if (scene) {
        if (scene.type === "Scene") {
            setSTI()
        } else {
            console.warn(
                "SVELTHREE > SessionXR : You have to provide a valid 'scene' prop of type 'Scene'!",
                { scene: scene }
            )
            throw new Error("SVELTHREE Exception (see warning above)")
        }
    } else {
        console.warn(
            "SVELTHREE > SessionXR : You have to provide a {scene} prop!",
            {
                scene: scene
            }
        )
        throw new Error("SVELTHREE Exception (see warning above)")
    }

    function setSTI() {
        if (scene.userData.sti >= 0) {
            sti = scene.userData.sti
        } else {
            console.warn(
                "SVELTHREE > SessionXR : Failed to set 'sti' from 'scene.userData.sti', 'sti' has to be >= 0!",
                {
                    scene: scene,
                    userData: scene.userData,
                    sti: scene.userData.sti
                }
            )
            throw new Error("SVELTHREE Exception (see warning above)")
        }
    }

    export let sessionMode: XRSessionMode = undefined
    export let requiredFeatures: string[] = undefined
    export let optionalFeatures: string[] = undefined
    export let btnClass: string = undefined
    export let btnTxt: { [key: string]: string } = undefined
    export let domOverlay: HTMLDivElement = undefined

    $: requiredFeatures ? updateRequiredFeatures() : null

    function updateRequiredFeatures(): void {
        $svelthreeStores[sti].xr.requiredFeatures = [...requiredFeatures]
        //console.warn("SVELTHREE > SessionXR > updateRequiredFeatures:", $svelthreeStores[sti].xr.requiredFeatures)
    }

    $: optionalFeatures ? updateOptionalFeatures() : null

    function updateOptionalFeatures(): void {
        $svelthreeStores[sti].xr.optionalFeatures = [...optionalFeatures]
        //console.warn("SVELTHREE > SessionXR > updateOptionalFeatures:",  $svelthreeStores[sti].xr.optionalFeatures)
    }

    $: domOverlay ? updateDomOverlay() : null

    function updateDomOverlay(): void {
        $svelthreeStores[sti].xr.domOverlay = domOverlay
        //console.warn("SVELTHREE > SessionXR > updateDomOverlay:",  $svelthreeStores[sti].xr.domOverlay)
    }

    let currentSession: XRSession
    let button: HTMLButtonElement
    let arButtonAdded: boolean = false

    $: if ($svelthreeStores[sti].renderer && !arButtonAdded) {
        createButton()
        $svelthreeStores[sti].xr.sessionMode = sessionMode
        arButtonAdded = true
    }

    // Set xr controller
    $: $svelthreeStores[sti].renderer
        ? ($svelthreeStores[sti].xr.controller = $svelthreeStores[
              sti
          ].renderer.xr.getController(0))
        : null

    // Add controller listeners based on required features
    $: if ($svelthreeStores[sti].xr.controller) {
        $svelthreeStores[sti].xr.controller.addEventListener("select", onSelect)

        $svelthreeStores[sti].xr.controller.addEventListener(
            "selectstart",
            onSelectStart
        )

        $svelthreeStores[sti].xr.controller.addEventListener(
            "selectend",
            onSelectEnd
        )

        if ($svelthreeStores[sti].xr.reticle === undefined) {
            scene.add($svelthreeStores[sti].xr.controller)
        }
    }

    export function disableSelect(): void {
        console.log("disableSelect!")
        $svelthreeStores[sti].xr.controller.removeEventListener(
            "select",
            onSelect
        )
    }

    /**
     * Controller listeners
     * TODO : make this complete, atm based on three.js AR hit-test example
     * @see https://www.w3.org/TR/webxr/#xrsession-interface Events
     * @see https://www.w3.org/TR/webxr/#eventdef-xrsession-select
     * @see https://www.w3.org/TR/webxr/#xrinputsource
     * @see https://www.w3.org/TR/webxr/#xrinputsourceevent
     */
    function onSelect(): void {
        /**
         *  AR (VR(?)) session with a reticle defined.
         */
        if ($svelthreeStores[sti].xr.reticle) {
            if ($svelthreeStores[sti].xr.reticle.visible) {
                dispatch("select", {
                    reticleMatrix: $svelthreeStores[sti].xr.reticle.matrix
                })
            }
        } else {
            /**
             *  AR (VR(?)) session with no reticle defined.
             */

            /*
            let dummy = new Object3D()
            dummy.position.set( 0, 0, - 0.3 ).applyMatrix4( svelthreeStores[sti].xr.controller.matrixWorld );
            dummy.quaternion.setFromRotationMatrix( svelthreeStores[sti].xr.controller.matrixWorld );
            */

            dispatch("select", {
                controllerMatrixWorld:
                    $svelthreeStores[sti].xr.controller.matrixWorld
            })
        }
    }

    function onSelectStart(): void {
        dispatch("selectstart", {
            controllerMatrixWorld:
                $svelthreeStores[sti].xr.controller.matrixWorld
        })
    }

    function onSelectEnd(): void {
        dispatch("selectend", {
            controllerMatrixWorld:
                $svelthreeStores[sti].xr.controller.matrixWorld
        })
    }

    // AR/VR Button creation
    function createButton(): void {
        if ("xr" in navigator) {
            button = document.createElement("button")
            button.id = "ARButton"
            button.style.display = "none"
            button.classList.add(btnClass)

            navigator.xr
                .isSessionSupported(sessionMode)
                .then(function (supported) {
                    supported ? showStartAR() : showARNotSupported()
                })
                .catch(showARNotSupported)

            //return button
            domOverlay.appendChild(button)
        } else {
            var message = document.createElement("a")

            if (window.isSecureContext === false) {
                message.href = document.location.href.replace(
                    /^http:/,
                    "https:"
                )
                message.innerHTML = btnTxt.notSecure
                    ? btnTxt.notSecure
                    : "WEBXR NEEDS HTTPS" // TODO Improve message
            } else {
                message.href = "https://immersiveweb.dev/"
                message.innerHTML = btnTxt.noXR
                    ? btnTxt.noXR
                    : "WEBXR NOT AVAILABLE"
            }

            message.style.left = "calc(50% - 90px)"
            message.style.width = "180px"
            message.style.textDecoration = "none"
            message.classList.add(btnClass)

            //return message
            domOverlay.appendChild(message)
        }

        function showStartAR(/*device*/): void {
            currentSession = null

            function onSessionStarted(session: XRSession) {
                // dom Overlay
                // session.domOverlayState.type is now set if supported,
                // or is null if the feature is not supported.

                session.addEventListener("end", onSessionEnded)

                /*
                session.updateWorldTrackingState( {
                'planeDetectionState': { 'enabled': true }
                } );
                */

                $svelthreeStores[sti].renderer.xr.setReferenceSpaceType("local")
                $svelthreeStores[sti].renderer.xr.setSession(session)
                button.textContent = btnTxt.stop ? btnTxt.stop : "STOP AR"

                currentSession = session
            }

            function onSessionEnded(/*event*/): void {
                currentSession.removeEventListener("end", onSessionEnded)
                button.textContent = btnTxt.start ? btnTxt.start : "START AR"
                currentSession = null
            }

            button.style.display = ""
            button.style.cursor = "pointer"
            button.style.left = "calc(50% - 50px)"
            button.style.width = "100px"

            button.textContent = btnTxt.start ? btnTxt.start : "START AR"

            button.onmouseenter = function (): void {
                button.style.opacity = "1.0"
            }

            button.onmouseleave = function () {
                button.style.opacity = "0.5"
            }

            button.onclick = function (): void {
                if (currentSession === null) {
                    navigator.xr
                        .requestSession(sessionMode, {
                            requiredFeatures: requiredFeatures,
                            optionalFeatures: optionalFeatures,
                            domOverlay: { root: domOverlay }
                        })
                        .then(onSessionStarted)
                } else {
                    currentSession.end()
                }
            }
        }

        function disableButton(): void {
            button.style.display = ""

            button.style.cursor = "auto"
            button.style.left = "calc(50% - 75px)"
            button.style.width = "150px"

            button.onmouseenter = null
            button.onmouseleave = null

            button.onclick = null
        }

        function showARNotSupported(): void {
            disableButton()

            button.textContent = btnTxt.noAR ? btnTxt.noAR : "AR NOT SUPPORTED"
        }
    }

    onMount(() => {
        console.info("SVELTHREE > onMount : SessionXR")
    })
</script>
