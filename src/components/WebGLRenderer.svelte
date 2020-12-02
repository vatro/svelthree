<script lang="typescript">
    /**
     * @author Vatroslav Vrbanic @see https://github.com/vatro
     */

    import { onMount } from "svelte"
    import { get_current_component } from "svelte/internal"
    import { UniversalPropIterator } from "../utils/UniversalPropIterator.svelte"
    import { svelthreeStores } from "../stores.js"
    import {
        WebGLRenderer,
        PCFSoftShadowMap,
        Scene,
        OrthographicCamera,
        PerspectiveCamera,
        Raycaster,
        Object3D,
        Vector3,
        Quaternion,
        Matrix4
    } from "svelthree-three"
    import type { ShadowMapType } from "svelthree-three"
    import WebXR from "./WebXR.svelte"
    import { createEventDispatcher } from "svelte"
    import { SvelteComponentDev } from "svelte/internal"

    let dispatch: (type: string, detail?: any) => void = createEventDispatcher()

    let renderer: WebGLRenderer
    let self = get_current_component()
    let rendererPropIterator: UniversalPropIterator

    export let config: { [key: string]: any } = undefined

    //props object can be filled with anything, ideally available THREE props of course.
    export let props: { [key: string]: any } = undefined

    /**
     * @see https://threejs.org/docs/#api/en/constants/Renderer
     * @see https://threejs.org/docs/#api/en/lights/shadows/LightShadow
     * @see https://threejs.org/docs/#api/en/lights/shadows/DirectionalLightShadow
     *
     * THREE.BasicShadowMap
     * THREE.PCFShadowMap
     * THREE.PCFSoftShadowMap
     * THREE.VSMShadowMap
     */

    export let enableShadowMap = false
    export let shadowMapType: ShadowMapType = PCFSoftShadowMap

    let sceneToRenderId: string
    export { sceneToRenderId as sceneId }

    let camToRenderId: string
    export { camToRenderId as camId }

    let currentScene: Scene = undefined
    let currentCam: OrthographicCamera | PerspectiveCamera = undefined

    let currentSceneId = ""
    let currentCamId = ""

    let canvas: HTMLCanvasElement = undefined

    export let sti: number

    if (sti === undefined) {
        console.warn("SVELTHREE > Scene : You have to provide a {sti} prop for the WebGLRenderer component!", {
            sti: sti
        })
        throw new Error("SVELTHREE Exception (see warning above)")
    }

    //triggered only once on init if there ish no current scene
    $: !renderer
        ? $svelthreeStores[sti].canvas.dom
            ? ((renderer = new WebGLRenderer({
                  canvas: $svelthreeStores[sti].canvas.dom,
                  ...config
              })),
              (canvas = $svelthreeStores[sti].canvas.dom),
              (rendererPropIterator = new UniversalPropIterator(renderer)),
              ($svelthreeStores[sti].renderer = renderer),
              ($svelthreeStores[sti].rendererComponent = self))
            : null
        : null

    $: renderer ? (enableShadowMap ? (renderer.shadowMap.enabled = true) : (renderer.shadowMap.enabled = false)) : null
    $: renderer ? (renderer.shadowMap.enabled ? (renderer.shadowMap.type = shadowMapType) : null) : null
    $: renderer
        ? props
            ? Object.keys(props).length > 0
                ? rendererPropIterator
                    ? rendererPropIterator.tryPropsUpdate(props)
                    : null
                : null
            : null
        : null

    export let xr: boolean = undefined
    $: renderer ? (xr ? (renderer.xr.enabled = true) : (renderer.xr.enabled = false)) : null

    $: !currentScene && sceneToRenderId ? ((currentScene = getSceneToRender()), activateCurrentScene()) : null
    $: !currentCam && currentSceneId ? ((currentCam = getCamToRender()), setCurrentCamActive()) : null

    $: {
        if (sceneToRenderId !== currentSceneId) {
            //won't trigger change if 'currentScene' is not being set, this happens first time onMount()
            if (currentScene) {
                deactivateCurrentScene()
                currentScene = getSceneToRender()
                activateCurrentScene()
            } else {
                //console.warn("SVELTHREE > WebGLRenderer : handle scene switch triggered, currentScene was NOT CHANGED:", {currentScene: currentScene})
            }
        }

        if (camToRenderId !== currentCamId) {
            //won't trigger change if 'currentCam' is not being set, this happens first time onMount()
            if (currentCam) {
                currentCam ? (setCurrentCamInactive(), (currentCam = getCamToRender()), setCurrentCamActive()) : null
            } else {
                //console.warn("SVELTHREE > WebGLRenderer : handle scene switch triggered, currentCam was NOT CHANGED:", {currentCam: currentCam})
            }
        }
    }

    //Reactive handling Canvas Resize by calling Canvas.doResize(w, h)
    let storeCanvasDimW: number
    let storeCanvasDimH: number
    // IMPORTANT!: the endpoint has to be a value not an object!!!
    $: storeCanvasDimW = $svelthreeStores[sti].canvas.dim.w
    $: storeCanvasDimH = $svelthreeStores[sti].canvas.dim.h
    $: (storeCanvasDimW || storeCanvasDimH) && canvas
        ? (console.info("SVELTHREE > WebGLRenderer : before resize renderer 1"),
          resizeRenderer(storeCanvasDimW, storeCanvasDimH),
          updateCameraAspect(storeCanvasDimW, storeCanvasDimH))
        : null

    // TODO  check, this is NOT working! Do we need this at all? Examine changing canvas via dom without this
    //
    //Reactive handling Canvas Resize via DOM (e.g. devtools)
    /*
    let devCanvasDimW
    let devCanvasDimH
    $: devCanvasDimW = $svelthreeStores[sti].canvas.dom ? $svelthreeStores[sti].canvas.dom.width :undefined
    $: devCanvasDimH = $svelthreeStores[sti].canvas.dom ?  $svelthreeStores[sti].canvas.dom.height  :undefined
    $: (devCanvasDimW || devCanvasDimH) && canvas ? updateCanvasDimInStore() : null // triggers above
    */

    $: renderer ? startAnimating() : null

    onMount(() => {
        console.info("SVELTHREE > onMount : WebGLRenderer")

        return () => {
            console.info("SVELTHREE > onDestroy : WebGLRenderer")
            stopAnimating()
        }
    })

    /**
     * // TODO  understand. STRANGE: if we run this inside reactive statement instead of the ternary version, there are no shadows ---> ???
     */
    /*
    function createRenderer():void {
        //Spread operator doesn't get transpiled by Svelte, BUG in Edge! see https://github.com/sveltejs/svelte/issues/3052
        //trying with rollup-babel-plugin --> works!
        renderer = new WebGLRenderer({
            canvas: $svelthreeStores[sti].canvas.dom,
            ...config
        })
        rendererPropIterator = new UniversalPropIterator(renderer)
    }
    */

    function setCurrentCamActive(): void {
        console.info("SVELTHREE > WebGLRenderer : setCurrentCamActive", {
            currentCam: currentCam.type,
            uuid: currentCam.uuid,
            isActive: currentCam.userData.isActive
        })
        currentCam.userData.isActive = true
        $svelthreeStores[sti].cameras[currentCam.userData.indexInCameras].isActive = true
        $svelthreeStores[sti].activeCamera = currentCam
        console.info(
            "SVELTHREE > WebGLRenderer : setCurrentCamActive",
            {
                currentCam: currentCam.type,
                uuid: currentCam.uuid,
                isActive: currentCam.userData.isActive
            },
            "done!"
        )
    }

    function setCurrentCamInactive(): void {
        console.info("SVELTHREE > WebGLRenderer : setCurrentCamInactive", {
            currentCam: currentCam.type,
            uuid: currentCam.uuid,
            isActive: currentCam.userData.isActive
        })
        currentCam.userData.isActive = false
        $svelthreeStores[sti].cameras[currentCam.userData.indexInCameras].isActive = false
        console.info(
            "SVELTHREE > WebGLRenderer : setCurrentCamInactive",
            {
                currentCam: currentCam.type,
                uuid: currentCam.uuid,
                isActive: currentCam.userData.isActive
            },
            "done!"
        )
    }

    function resizeRenderer(tW: number, tH: number): void {
        console.info("SVELTHREE > WebGLRenderer : resizeRenderer!")
        renderer ? renderer.setSize(tW, tH, false) : null
    }

    function updateCameraAspect(tW: number, tH: number): void {
        console.info("SVELTHREE > WebGLRenderer : updateCameraAspect!")
        currentCam
            ? (currentCam.type === "PerspectiveCamera" ? (currentCam.aspect = tW / tH) : null,
              currentCam.updateProjectionMatrix())
            : null
    }

    function getSceneToRender(): Scene {
        console.info("SVELTHREE > WebGLRenderer : getSceneToRender!")
        if ($svelthreeStores[sti].scenes.length > 0) {
            if (sceneToRenderId === undefined) {
                console.warn("SVELTHREE > WebGLRenderer : You have to provide the 'sceneId' prop!", {
                    sceneId: sceneToRenderId
                })
                throw new Error("SVELTHREE Exception (see warning above)")
            } else {
                for (let i = 0; i < $svelthreeStores[sti].scenes.length; i++) {
                    let item = $svelthreeStores[sti].scenes[i]

                    if (item.id === sceneToRenderId) {
                        currentSceneId = sceneToRenderId
                        return item.scene
                    }
                }

                console.warn("SVELTHREE > WebGLRenderer : Scene with id '" + sceneToRenderId + "' not found!", {
                    scenes: $svelthreeStores[sti].scenes
                })
                throw new Error("SVELTHREE Exception (see warning above)")
            }
        } else {
            console.warn("SVELTHREE > WebGLRenderer : getSceneToRender: No Scenes available!", {
                scenes: $svelthreeStores[sti].scenes
            })
            throw new Error("SVELTHREE Exception (see warning above)")
        }
    }

    function getCamToRender(): PerspectiveCamera | OrthographicCamera {
        console.info("SVELTHREE > WebGLRenderer : getCamToRender!")
        if ($svelthreeStores[sti].cameras.length > 0) {
            if (camToRenderId === undefined) {
                console.warn("SVELTHREE > WebGLRenderer : You have to provide the 'camId' prop!", {
                    camId: camToRenderId
                })
                throw new Error("SVELTHREE Exception (see warning above)")
            } else {
                for (let i = 0; i < $svelthreeStores[sti].cameras.length; i++) {
                    let item = $svelthreeStores[sti].cameras[i]
                    if (item.id === camToRenderId) {
                        currentCamId = camToRenderId
                        return item.camera
                    }
                }

                console.warn("SVELTHREE > WebGLRenderer : Camera with id '" + camToRenderId + "' not found!", {
                    cameras: $svelthreeStores[sti].cameras
                })
                throw new Error("SVELTHREE Exception (see warning above)")
            }
        } else {
            console.warn(
                "SVELTHREE > WebGLRenderer : getCamToRender: No Cameras available! $svelthreeStores[sti].cameras:",
                { cameras: $svelthreeStores[sti].cameras }
            )
            throw new Error("SVELTHREE Exception (see warning above)")
        }
    }

    function deactivateCurrentScene(): void {
        if (currentScene.userData.isActive === true) {
            currentScene.userData.isActive = false
            $svelthreeStores[sti].scenes[currentScene.userData.indexInScenes].isActive = false
        }
    }

    function activateCurrentScene(): void {
        //resume animations only if scene was being deactivated before
        if (currentScene.userData.isActive === false) {
            currentScene.userData.isActive = true
            $svelthreeStores[sti].scenes[currentScene.userData.indexInScenes].isActive = true

            $svelthreeStores[sti].currentSceneIndex = currentScene.userData.indexInScenes + 1

            /** would also work
            props.scenes[currentScene.userData.indexInScenes].isActive = true
            $svelthreeStores = $svelthreeStores
             */
        } else if (currentScene.userData.isActive === undefined) {
            console.info(currentScene)

            currentScene.userData.isActive = true
            $svelthreeStores[sti].scenes[currentScene.userData.indexInScenes].isActive = true

            $svelthreeStores[sti].currentSceneIndex = currentScene.userData.indexInScenes + 1

            /** would also work
            props.scenes[currentScene.userData.indexInScenes].isActive = true
            $svelthreeStores = $svelthreeStores
             */
        }
    }

    let doAnimate = false
    let rAF: number = undefined

    function startAnimating(): void {
        console.info("SVELTHREE > WebGLRenderer > startAnimating!")
        doAnimate = true
        animate()
    }

    //called internally 'onDestroy'
    export function stopAnimating(): void {
        doAnimate = false
        cancelAnimationFrame(rAF)
    }

    let logOnce = true

    // ------------- Interaction --------------------

    let isInteractive = false
    let raycaster: Raycaster
    $: $svelthreeStores[sti].canvas.interactive
        ? ((raycaster = $svelthreeStores[sti].raycaster), (isInteractive = true))
        : null

    $: !$svelthreeStores[sti].canvas.interactive ? ((isInteractive = false), (raycaster = null)) : null

    // ----------------------------------------------

    function changeCursor(doit: boolean): void {
        //pBoolean ? $svelthreeStores[sti].canvas.dom.style.cursor = "$svelthreeStores[sti].pointer" : $svelthreeStores[sti].canvas.dom.style.cursor = "default"
        //Problem with above: canvas triggers reactive statement above because style changes! FIX below

        if (doit) {
            if ($svelthreeStores[sti].allIntersections[0].object.userData.interact) {
                document.body.style.cursor = "pointer"
            } else if ($svelthreeStores[sti].orbitcontrols) {
                document.body.style.cursor = "all-scroll"
            } else {
                document.body.style.cursor = "default"
            }
        } else {
            if ($svelthreeStores[sti].orbitcontrols) {
                document.body.style.cursor = "all-scroll"
            } else {
                document.body.style.cursor = "default"
            }
        }
    }

    let leftCanvas = true

    function checkCursor(): void {
        $svelthreeStores[sti].pointer.isOverCanvas
            ? ((leftCanvas = false),
              $svelthreeStores[sti].allIntersections
                  ? $svelthreeStores[sti].allIntersections.length > 0
                      ? changeCursor(true)
                      : changeCursor(false)
                  : null)
            : !leftCanvas
            ? ((leftCanvas = true), (document.body.style.cursor = "default"))
            : null
    }

    let toTest: Object3D[]

    function animate(): void {
        //console.info("SVELTHREE > WebGLRenderer > animate!")
        if (renderer.xr.enabled === false) {
            render()
        } else {
            renderer.setAnimationLoop(render)
        }
    }

    let webxr: WebXR

    // TODO : timestamp and frame types? timestamp / time unused. --> see onAnimationFrame() in WebXRManager.js
    function render(timestamp: any = undefined, frame: XRFrame = undefined): void {
        if (doAnimate) {
            if (logOnce) {
                logOnce = false
                console.info("SVELTHREE > WebGLRenderer > animate!", currentScene, currentCam, canvas)
            }

            // Intersections / Raycaster using Camera and pointer.pos (NonXR)
            if (renderer.xr.enabled === false) {
                isInteractive
                    ? (raycaster.setFromCamera($svelthreeStores[sti].pointer.pos, currentCam),
                      (toTest = currentScene.children.filter((child) => child.type === "Mesh")),
                      ($svelthreeStores[sti].allIntersections = raycaster.intersectObjects(toTest, true)))
                    : null

                isInteractive ? checkCursor() : null

                // OrbitControls (NonXR)
                // required if controls.enableDamping or controls.autoRotate are set to true
                $svelthreeStores[sti].orbitcontrols ? $svelthreeStores[sti].orbitcontrols.update() : null
            }

            //update cube cameras
            if ($svelthreeStores[sti].cubeCameras.length > 0) {
                for (let i = 0; i < $svelthreeStores[sti].cubeCameras.length; i++) {
                    let cubeCamComponent: SvelteComponentDev = $svelthreeStores[sti].cubeCameras[i]
                    cubeCamComponent.doUpdate()
                }
            }

            if (renderer.xr.enabled === true) {
                renderXR(timestamp, frame)
            }

            dispatch("render", { timestamp: timestamp })
            renderer.render(currentScene, currentCam)

            if (renderer.xr.enabled === false) {
                rAF = requestAnimationFrame(animate)
            }
        }
    }

    let lastTimeStamp

    function renderXR(timestamp: number = undefined, frame: XRFrame = undefined): void {
        if (frame) {
            let delta: number

            if (lastTimeStamp) {
                delta = timestamp - lastTimeStamp
                lastTimeStamp = timestamp
            } else {
                lastTimeStamp = timestamp
                delta = 0
            }

            $svelthreeStores[sti].xr.currentFrame = {
                timestamp: timestamp,
                delta: delta,
                frame: frame
            }

            dispatch("xrframe", {
                timestamp: timestamp,
                delta: delta,
                frame: frame
            })

            switch ($svelthreeStores[sti].xr.sessionMode) {
                case "inline":
                    console.error(
                        "SVELTHREE > WebGLRenderer > renderXR : XRSessionMode 'inline' is not yet implemented!"
                    )
                    break
                case "immersive-ar":
                    renderAR(timestamp, frame)
                    break
                case "immersive-vr":
                    break
                default:
                    break
            }
        }
    }

    function renderAR(timestamp: number = undefined, frame: XRFrame = undefined): void {
        let referenceSpace: XRReferenceSpace = renderer.xr.getReferenceSpace() as XRReferenceSpace
        let session: XRSession = renderer.xr.getSession() as XRSession

        if ($svelthreeStores[sti].xr.hitTestMode === "realworld") {
            webxr.performRealWorldHitTest(referenceSpace, session, timestamp, frame)
        } else if ($svelthreeStores[sti].xr.hitTestResults !== undefined) {
            $svelthreeStores[sti].xr.hitTestResults = undefined
        }
    }

    /**
     * Public methods
     */

    export function getRenderer(): WebGLRenderer {
        return renderer
    }

    export function getCurrentCamera(): PerspectiveCamera | OrthographicCamera {
        return currentCam
    }

    // TODO  different?
    export function setRender(parameters = { sceneId: "", camId: "" }): void {
        sceneToRenderId = parameters.sceneId
        camToRenderId = parameters.camId
    }
</script>

<WebXR bind:this={webxr} {sti} />
