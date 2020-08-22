<script lang="typescript">
    /**
     * @author Vatroslav Vrbanic @see https://github.com/vatro
     */

    /**
     * This started as an adaption of the three.js AR hittest example (ARButton)
     * @see https://threejs.org/examples/?q=XR#webxr_ar_hittest
     * and became more and more something else. Initially planed to make a SessionXR component
     * but then switch to having two components SessionAR and SessionVR.
     *  TODO : contribute to three.js (change ARButton so it uses the 'dom-overlay' feature)
     */

    import { onMount } from "svelte"
    import { svelthreeStores } from "../stores.js"
    import { createEventDispatcher } from "svelte"
    import { Vector3, Quaternion, Object3D } from "svelthree-three"

    let dispatch: (type: string, detail?: any) => void = createEventDispatcher()

    export let sti: number

    if (sti === undefined) {
        console.warn(
            "SVELTHREE > Scene : You have to provide a {sti} prop for the WebGLRenderer component!",
            { sti: sti }
        )
        throw new Error("SVELTHREE Exception (see warning above)")
    }

    let store = $svelthreeStores[sti]

    const sessionMode: XRSessionMode = "immersive-ar"
    export let requiredFeatures: string[] = undefined
    export let hitTestMode: XRHitTestMode = "virtual" // default is "virtual", meaning no real world testing
    export let optionalFeatures: string[] = undefined
    export let btnClass: string = undefined
    export let btnTxt: { [key: string]: string } = undefined
    export let domOverlay: HTMLDivElement = undefined

    $: requiredFeatures ? updateRequiredFeatures() : null

    function updateRequiredFeatures(): void {
        store.xr.requiredFeatures = [...requiredFeatures]
        //console.warn("SVELTHREE > SessionAR > updateRequiredFeatures:",store.xr.requiredFeatures)
    }

    $: hitTestMode ? updateHitTestMode() : null

    function updateHitTestMode(): void {
        if (hitTestMode === "realworld") {
            if (requiredFeatures.indexOf("hit-test") > -1) {
                store.xr.hitTestMode = hitTestMode
            } else {
                console.warn(
                    "SVELTHREE > SessionAR : You need to add feature descriptor 'hit-test' to requiredFeatures in order to use 'realworld' hit-test mode",
                    {
                        requiredFeatures: requiredFeatures
                    }
                )
                throw new Error("SVELTHREE Exception (see warning above)")
            }
        } else {
            store.xr.hitTestMode = hitTestMode
        }

        if (!store.xr.hitTestModeInitial) {
            store.xr.hitTestModeInitial = store.xr.hitTestMode
        }
    }

    $: optionalFeatures ? updateOptionalFeatures() : null

    function updateOptionalFeatures(): void {
        store.xr.optionalFeatures = [...optionalFeatures]
        //console.warn("SVELTHREE > SessionAR > updateOptionalFeatures:", store.xr.optionalFeatures)
    }

    $: domOverlay ? updateDomOverlay() : null

    function updateDomOverlay(): void {
        store.xr.domOverlay = domOverlay
        //console.warn("SVELTHREE > SessionAR > updateDomOverlay:", store.xr.domOverlay)
    }

    let currentSession: XRSession
    let button: HTMLButtonElement
    let arButtonAdded: boolean = false

    $: if (store.canvas.dom && !arButtonAdded) {
        createButton()
        store.xr.sessionMode = sessionMode
        arButtonAdded = true
    }

    $: if (store.renderer && currentSession && !store.xr.controller) {
        store.xr.controller = store.renderer.xr.getController(0)
        addControllerListeners()
    }

    function addControllerListeners() {
        store.xr.controller.addEventListener("select", onSelect)
        store.xr.controller.addEventListener("selectstart", onSelectStart)
        store.xr.controller.addEventListener("selectend", onSelectEnd)
        // TODO: put in SessionVR and delete here
        //store.xr.controller.addEventListener("squeeze", onSelect)
        //store.xr.controller.addEventListener("squeezestart", onSelect)
        //store.xr.controller.addEventListener("squeezeend", onSelect)
    }

    function onSelect(): void {
        /**
         *  AR (VR(?)) session with a reticle defined.
         */
        if (store.xr.reticle && hitTestMode === "realworld") {
            if (store.xr.reticle.visible) {
                dispatch("select", {
                    reticleMatrix: store.xr.reticle.matrix
                })
            }
        } else {
            // this is performant: it happens only on select, not on every frame or similar
            if (store.raycaster && store.xr.controller) {
                performVirtualHitTest()
            }

            dispatch("select", {
                controllerMatrixWorld: store.xr.controller.matrixWorld
            })
        }
    }

    function onSelectStart(): void {
        dispatch("selectstart", {
            controllerMatrixWorld: store.xr.controller.matrixWorld
        })
    }

    function onSelectEnd(): void {
        dispatch("selectend", {
            controllerMatrixWorld: store.xr.controller.matrixWorld
        })
    }

    // TODO: put these handlers in SessionVR and delete here
    /*
    function onSqueeze(): void {
        dispatch("squeeze", {
            controllerMatrixWorld:
               store.xr.controller.matrixWorld
        })
    }

    function onSqueezeStart(): void {
        dispatch("squeezestart", {
            controllerMatrixWorld:
               store.xr.controller.matrixWorld
        })
    }

    function onSqueezeEnd(): void {
        dispatch("squeezeend", {
            controllerMatrixWorld:
               store.xr.controller.matrixWorld
        })
    }
    */

    /**
     * We have to add the AR controller to the scene BEFORE hit test in order for it
     * to have proper matrixWorld on 'select' (first click after hitTestMode change)
     */

    // TODO : apply this kind of "hack" everywhere if needed

    //BAD practice
    //$: hitTestMode === "virtual" && store.currentSceneIndex ? tryAddingControllerToScene() : null // executed on every flush / update

    // GOOD practice (prevent unnecessary function calls)

    let currentSceneIndex = undefined
    $: if (store.currentSceneIndex) {
        currentSceneIndex = store.currentSceneIndex
    }

    $: if (hitTestMode === "virtual" && currentSceneIndex) {
        tryAddingControllerToScene()
    }

    function tryAddingControllerToScene() {
        debugger
        let currentScene = store.scenes[store.currentSceneIndex - 1].scene

        if (store.xr.controller.parent !== currentScene) {
            currentScene.add(store.xr.controller)
        }
    }

    // ---- Virtual Hit Test ----

    function performVirtualHitTest(): void {
        console.warn("SessionAR performVirtualHitTest!")

        let currentScene = store.scenes[store.currentSceneIndex - 1].scene

        let originXR: Vector3 = new Vector3(0, 0, 0)
        let directionXR: Vector3 = new Vector3(0, 0, -1)
        let quaternion: Quaternion = new Quaternion()
        let scale: Vector3 = new Vector3(1, 1, 1)

        store.xr.controller.matrixWorld.decompose(originXR, quaternion, scale)

        directionXR.applyQuaternion(quaternion).normalize()

        store.raycaster.set(originXR, directionXR)

        let toTest = currentScene.children.filter(
            (child: Object3D) => child.type === "Mesh"
        )

        store.allIntersections = store.raycaster.intersectObjects(toTest, true)
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
                    : "WEBXR NEEDS HTTPS" // TODO Improve message (original three.js comment)
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
                /**
                 * concerning domOverlay:
                 * session.domOverlayState.type is now set if supported,
                 * or is null if the feature is not supported.
                */

                // TODO : understand why this is here (original three.js comment)
                /*
                session.updateWorldTrackingState( {
                'planeDetectionState': { 'enabled': true }
                } );
                */

                session.addEventListener("end", onSessionEnded)
                store.renderer.xr.setReferenceSpaceType("local")
                store.renderer.xr.setSession(session)
                button.textContent = btnTxt.stop ? btnTxt.stop : "STOP AR"

                currentSession = session

                dispatch("started", { session: currentSession })
            }

            function onSessionEnded(/*event*/): void {
                currentSession.removeEventListener("end", onSessionEnded)
                button.textContent = btnTxt.start ? btnTxt.start : "START AR"

                //reset store
                store.renderer.xr.setSession(null)
                store.allIntersections = undefined

                store.renderer = undefined
                //store.raycaster = undefined // reuse initally created raycaster (Canvas)

                store.scenes = []
                store.currentSceneIndex = undefined
                store.cameras = []
                store.activeCamera = undefined

                store.xr.controller = undefined
                store.xr.hitTestSource = null
                store.xr.hitTestSourceRequested = false
                store.xr.hitTestResults = undefined
                store.xr.reticle = undefined

                hitTestMode = store.xr.hitTestModeInitial
                currentSession = null
                currentSceneIndex = undefined
                dispatch("ended")
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
                        .then((session) => {
                            dispatch("ready", { session: currentSession })
                            tryOnSessionStarted(session)
                        })
                } else {
                    currentSession.end()
                }
            }

            function tryOnSessionStarted(session: XRSession): void {
                if (store.renderer) {
                    onSessionStarted(session)
                } else {
                    setTimeout(() => {
                        tryOnSessionStarted(session)
                    }, 100)
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
        console.info("SVELTHREE > onMount : SessionAR")
    })

    export function sethitTestMode(mode: XRHitTestMode) {
        hitTestMode = mode
    }
</script>
