<script lang="ts">
    /**
     * @author Vatroslav Vrbanic @see https://github.com/vatro
     */

    /**
     * This started as an adaption of the SessionAR component
     * @see https://github.com/mrdoob/three.js/blob/master/examples/jsm/webxr/VRButton.js
     * @see https://github.com/mrdoob/three.js/blob/master/examples/webxr_vr_dragging.html (2 controllers)
     */

    import { onMount } from "svelte"
    import { svelthreeStores } from "../stores.js"
    import { createEventDispatcher } from "svelte"
    import { Vector3, Quaternion, Object3D, Group, Matrix4, XRControllerModelFactory, BufferGeometry, Line } from "svelthree-three"

    let dispatch: (type: string, detail?: any) => void = createEventDispatcher()

    export let sti: number

    if (sti === undefined) {
        console.warn(
            "SVELTHREE > SessionVR : You have to provide a {sti} prop for the WebGLRenderer component!",
            { sti: sti }
        )
        throw new Error("SVELTHREE Exception (see warning above)")
    }

    const sessionMode: XRSessionMode = "immersive-vr"
    export let requiredFeatures: string[] = undefined
    const hitTestMode: XRHitTestMode = "virtual" // no real world testing in VR
    export let optionalFeatures: string[] = undefined // 'local-floor', 'bounded-floor', 'hand-tracking'
    export let btnClass: string = undefined
    export let btnTxt: { [key: string]: string } = undefined
    export let domOverlay: HTMLDivElement = undefined
    export let maxControllers: number = 2 // defualt 2 controllers

    $: requiredFeatures ? updateRequiredFeatures() : null

    function updateRequiredFeatures(): void {
        $svelthreeStores[sti].xr.requiredFeatures = [...requiredFeatures]
        //console.warn("SVELTHREE > SessionVR > updateRequiredFeatures:",$svelthreeStores[sti].xr.requiredFeatures)
    }

    $svelthreeStores[sti].xr.hitTestMode = hitTestMode
    $svelthreeStores[sti].xr.hitTestModeInitial = $svelthreeStores[sti].xr.hitTestMode

    $: optionalFeatures ? updateOptionalFeatures() : null

    function updateOptionalFeatures(): void {
        $svelthreeStores[sti].xr.optionalFeatures = [...optionalFeatures]
        //console.warn("SVELTHREE > SessionVR > updateOptionalFeatures:", $svelthreeStores[sti].xr.optionalFeatures)
    }

    $: domOverlay ? updateDomOverlay() : null

    function updateDomOverlay(): void {
        $svelthreeStores[sti].xr.domOverlay = domOverlay
        //console.warn("SVELTHREE > SessionVR > updateDomOverlay:", $svelthreeStores[sti].xr.domOverlay)
    }

    let currentSession: XRSession
    let button: HTMLButtonElement
    let vrButtonAdded: boolean = false

    $: if ($svelthreeStores[sti].canvas.dom && !vrButtonAdded && domOverlay) {
        console.warn(domOverlay)
        createButton()
        $svelthreeStores[sti].xr.sessionMode = sessionMode
        vrButtonAdded = true
    }

    /*
    $: if ($svelthreeStores[sti].renderer && currentSession && $svelthreeStores[sti].xr.controllers.length === 0) {
        
        getControllers()
        addControllerListeners()
    }
    */

    function getControllers() {
        console.warn("SVELTHREE > SessionVR > getControllers!")
        for (let i = 0; i < maxControllers; i++) {
            let controller = $svelthreeStores[sti].renderer.xr.getController(i)
            $svelthreeStores[sti].xr.controllers.push(controller)
            console.warn("SVELTHREE > SessionVR > getControllers! $svelthreeStores[sti].xr.controllers: ", $svelthreeStores[sti].xr.controllers)
        }
    }

    function addControllerListeners() {
        console.warn("SVELTHREE > SessionVR > addControllerListeners!")
        for (let i = 0; i < $svelthreeStores[sti].xr.controllers.length; i++) {
            $svelthreeStores[sti].xr.controllers[i].addEventListener("select", onSelect)
            console.warn("SVELTHREE > SessionVR > addControllerListeners! $svelthreeStores[sti].xr.controllers[i]: ", $svelthreeStores[sti].xr.controllers[i])
            /*
            $svelthreeStores[sti].xr.controllers[i].addEventListener("selectstart", onSelectStart)
            $svelthreeStores[sti].xr.controllers[i].addEventListener("selectend", onSelectEnd)
            $svelthreeStores[sti].xr.controllers[i].addEventListener("squeeze", onSqueeze)
            $svelthreeStores[sti].xr.controllers[i].addEventListener("squeezestart", onSqueezeStart)
            $svelthreeStores[sti].xr.controllers[i].addEventListener("squeezeend", onSqueezeEnd)
            */
        }
        
    }

    function onSelect(e): void {
        //we need to access something usefull here in order get controller matrix
        console.warn("SVELTHREE > SessionVR > onSelect! e: ", e)
        if ($svelthreeStores[sti].raycaster) {
            performVirtualHitTest(e.target)
        }

        console.warn("SVELTHREE > SessionVR > onSelect! e.target.matrixWorld: ", e.target.matrixWorld)
        dispatch("select", {
            controllerMatrixWorld: e.target.matrixWorld
        })
    }

    /*
    function onSelectStart(): void {
        dispatch("selectstart", {
            controllerMatrixWorld: $svelthreeStores[sti].xr.controller.matrixWorld
        })
    }

    function onSelectEnd(): void {
        dispatch("selectend", {
            controllerMatrixWorld: $svelthreeStores[sti].xr.controller.matrixWorld
        })
    }

    function onSqueeze(): void {
        dispatch("squeeze", {
            controllerMatrixWorld:
               $svelthreeStores[sti].xr.controller.matrixWorld
        })
    }

    function onSqueezeStart(): void {
        dispatch("squeezestart", {
            controllerMatrixWorld:
               $svelthreeStores[sti].xr.controller.matrixWorld
        })
    }

    function onSqueezeEnd(): void {
        dispatch("squeezeend", {
            controllerMatrixWorld:
               $svelthreeStores[sti].xr.controller.matrixWorld
        })
    }
    */

    let controllerModelFactory:XRControllerModelFactory = new XRControllerModelFactory();
    let lineGeom = new BufferGeometry().setFromPoints( [ new Vector3( 0, 0, 0 ), new Vector3( 0, 0, - 1 ) ] );
    let line = new Line( lineGeom );
    line.name = 'line';
	line.scale.z = 5;

    /**
     * We have to add the AR controller to the scene BEFORE hit test in order for it
     * to have proper matrixWorld on 'select' (first click after hitTestMode change)
     */

    // TODO : apply this kind of "hack" everywhere if needed

    //BAD practice
    //$: hitTestMode === "virtual" && $svelthreeStores[sti].currentSceneIndex ? tryAddingControllerToScene() : null // executed on every flush / update

    // GOOD practice (prevent unnecessary function calls)

    let currentSceneIndex = undefined
    $: if ($svelthreeStores[sti].currentSceneIndex) {
        currentSceneIndex = $svelthreeStores[sti].currentSceneIndex
    }

    $: if (currentSceneIndex) {
        console.warn("SVELTHREE > SessionVR > currentSceneIndex: ", currentSceneIndex)
        getControllers()
        addControllerListeners()
        tryAddingControllersToScene()
    }

    function tryAddingControllersToScene() {
        console.warn("SVELTHREE > SessionVR > tryAddingControllersToScene!")
        let currentScene = $svelthreeStores[sti].scenes[$svelthreeStores[sti].currentSceneIndex - 1].scene

        console.warn("SVELTHREE > SessionVR > tryAddingControllersToScene! currentScene:", currentScene)

        for (let i = 0; i < $svelthreeStores[sti].xr.controllers.length; i++) {
            
            if ($svelthreeStores[sti].xr.controllers[i].parent !== currentScene) {
                console.warn("SVELTHREE > SessionVR > tryAddingControllersToScene! $svelthreeStores[sti].xr.controllers[i]:", $svelthreeStores[sti].xr.controllers[i])
                
                currentScene.add($svelthreeStores[sti].xr.controllers[i])

                let controllerGrip = $svelthreeStores[sti].renderer.xr.getControllerGrip( i );
                console.warn("SVELTHREE > SessionVR > tryAddingControllersToScene! controllerGrip:", controllerGrip)

				controllerGrip.add( controllerModelFactory.createControllerModel( controllerGrip ) );
                currentScene.add( controllerGrip );

                console.warn("SVELTHREE > SessionVR > tryAddingControllersToScene! currentScene:", currentScene)
                
                $svelthreeStores[sti].xr.controllers[i].add( line.clone() );
                console.warn("SVELTHREE > SessionVR > tryAddingControllersToScene! $svelthreeStores[sti].xr.controllers[i] (after line added):", $svelthreeStores[sti].xr.controllers[i])
                
            }
        }
    }

    // ---- VR Hit Test ----

    let tempMatrix:Matrix4 = new Matrix4()

    function performVirtualHitTest(controller:Group): void {
        console.warn("SessionVR performVirtualHitTest!")

        let currentScene = $svelthreeStores[sti].scenes[$svelthreeStores[sti].currentSceneIndex - 1].scene

        tempMatrix.identity().extractRotation( controller.matrixWorld );

        $svelthreeStores[sti].raycaster.ray.origin.setFromMatrixPosition( controller.matrixWorld );
        $svelthreeStores[sti].raycaster.ray.direction.set( 0, 0, - 1 ).applyMatrix4( tempMatrix );

        let toTest = currentScene.children.filter(
            (child: Object3D) => child.type === "Mesh"
        )

		$svelthreeStores[sti].allIntersections = $svelthreeStores[sti].raycaster.intersectObjects( toTest, true );
    }

    // AR Button creation
    function createButton(): void {
        if ("xr" in navigator) {
            button = document.createElement("button")
            button.id = "VRButton"
            button.style.display = "none"
            button.classList.add(btnClass)

            navigator.xr
                .isSessionSupported(sessionMode)
                .then(function (supported) {
                    supported ? showEnterVR() : showVRNotSupported()
                })
                .catch(showVRNotSupported)

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

        function showEnterVR(/*device*/): void {
            currentSession = null

            function onSessionStarted(session: XRSession) {
                /**
                 * concerning domOverlay:
                 * session.domOverlayState.type is now set if supported,
                 * or is null if the feature is not supported.
                 */

                session.addEventListener("end", onSessionEnded)
                $svelthreeStores[sti].renderer.xr.setSession(session)
                button.textContent = btnTxt.stop ? btnTxt.stop : "EXIT VR"

                currentSession = session

                dispatch("started", { session: currentSession })
            }

            function onSessionEnded(/*event*/): void {
                currentSession.removeEventListener("end", onSessionEnded)
                button.textContent = btnTxt.start ? btnTxt.start : "ENTER VR"

                //reset store
                $svelthreeStores[sti].renderer.xr.setSession(null)
                $svelthreeStores[sti].allIntersections = undefined

                $svelthreeStores[sti].renderer = undefined
                //$svelthreeStores[sti].raycaster = undefined // reuse initally created raycaster (Canvas)

                $svelthreeStores[sti].scenes = []
                $svelthreeStores[sti].currentSceneIndex = undefined
                $svelthreeStores[sti].cameras = []
                $svelthreeStores[sti].activeCamera = undefined

                $svelthreeStores[sti].xr.controller = undefined
                $svelthreeStores[sti].xr.hitTestSource = null
                $svelthreeStores[sti].xr.hitTestSourceRequested = false
                $svelthreeStores[sti].xr.hitTestResults = undefined
                $svelthreeStores[sti].xr.reticle = undefined

                currentSession = null
                currentSceneIndex = undefined

                dispatch("ended")
            }

            button.style.display = ""
            button.style.cursor = "pointer"
            button.style.left = "calc(50% - 50px)"
            button.style.width = "100px"

            button.textContent = btnTxt.start ? btnTxt.start : "ENTER VR"

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
                if ($svelthreeStores[sti].renderer) {
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

        function showVRNotSupported(): void {
            disableButton()

            button.textContent = btnTxt.noVR ? btnTxt.noVR : "VR NOT SUPPORTED"
        }
    }

    onMount(() => {
        console.info("SVELTHREE > onMount : SessionVR")
    })
</script>
