<!--
`accessors:true` hast to be set per component because of the svelte-language-server bug, otherwise accessors would be falsely detected as missing and highlighted as errors.
svelthree uses svelte-accmod, where accessors are always `true`, regardless of `svelte:options`.  
-->
<svelte:options accessors />

<!-- 
@component
This is a **svelthree** _WebGLRenderer_ Component.  
 TODO  Link to Docs.
-->
<script lang="ts">
	import { afterUpdate, beforeUpdate, createEventDispatcher, onMount, tick } from "svelte"
	import { get_current_component, SvelteComponentDev } from "svelte/internal"
	import { Camera, Object3D, PCFSoftShadowMap, Raycaster, Scene, WebGLRenderer } from "three"
	import type { XRFrame, XRSession } from "three"
	import { XRDefaults } from "../constants"
	import { svelthreeStores } from "../stores"
	import { Propeller, PropUtils } from "../utils"
	import { XRHitTestAR } from "../xr"

	const css_rs = "color: red;font-weight:bold;"
	const css_ba = "color: blue;font-weight:bold;"
	const css_aa = "color: green;font-weight:bold;"
	export let logInfo: boolean = false
	export let logRS: boolean = false
	export let logLC: boolean = false

	let dispatch: (type: string, detail?: any) => void = createEventDispatcher()

	export function getDispatcher(): any {
		return dispatch
	}

	let renderer: WebGLRenderer
	let self = get_current_component()

	export let config: { [key: string]: any } = undefined

	// props object can be filled with anything, ideally available THREE props of course.
	export let props: { [key: string]: any } = undefined
	let propsPrev: typeof props = undefined

	/*
     @see https://threejs.org/docs/#api/en/constants/Renderer
     @see https://threejs.org/docs/#api/en/lights/shadows/LightShadow
     @see https://threejs.org/docs/#api/en/lights/shadows/DirectionalLightShadow
     
     THREE.BasicShadowMap
     THREE.PCFShadowMap
     THREE.PCFSoftShadowMap
     THREE.VSMShadowMap
    */

	export let enableShadowMap = false
	export let shadowMapType: THREE.ShadowMapType = PCFSoftShadowMap

	let sceneToRenderId: string
	export { sceneToRenderId as sceneId }

	let camToRenderId: string
	export { camToRenderId as camId }

	let currentScene: Scene = undefined
	let currentCam: Camera = undefined

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
	/*
    $: !renderer
        ? $svelthreeStores[sti].canvas.dom
            ? ((renderer = new WebGLRenderer({
                  canvas: $svelthreeStores[sti].canvas.dom,
                  ...config
              })),
              (canvas = $svelthreeStores[sti].canvas.dom),
              ($svelthreeStores[sti].renderer = renderer),
              ($svelthreeStores[sti].rendererComponent = self))
            : null
        : null
    */

	//$: !renderer ? ($svelthreeStores[sti].canvas.dom ? createRenderer() : null) : null
	$: if (!renderer) {
		if ($svelthreeStores[sti].canvas.dom) createRenderer()
	}

	function createRenderer(): void {
		if (logRS)
			console.log("%c------> WebGLRenderer > reactive statement! > createRenderer! at start", `${css_rs}`, {
				renderer
			})

		renderer = new WebGLRenderer({ canvas: $svelthreeStores[sti].canvas.dom, ...config })
		canvas = $svelthreeStores[sti].canvas.dom
		$svelthreeStores[sti].renderer = renderer
		$svelthreeStores[sti].rendererComponent = self

		if (logRS)
			console.log("%c------> WebGLRenderer > reactive statement! > createRenderer! at end", `${css_rs}`, {
				renderer
			})
	}

	/*
    $: renderer ? (enableShadowMap ? (renderer.shadowMap.enabled = true) : (renderer.shadowMap.enabled = false)) : null
    $: renderer ? (renderer.shadowMap.enabled ? (renderer.shadowMap.type = shadowMapType) : null) : null
    */

	$: renderer ? setShadowMapStatus() : null

	function setShadowMapStatus() {
		renderer.shadowMap.enabled = enableShadowMap ? true : false

		if (logRS)
			console.log(
				"%c------> WebGLRenderer > reactive statement! > setShadowMapStatus!",
				`${css_rs}`,
				{ enableShadowMap },
				{ "renderer.shadowMap.enabled": renderer.shadowMap.enabled }
			)
	}

	$: renderer && renderer.shadowMap.enabled ? setShadowMapType() : null

	function setShadowMapType() {
		renderer.shadowMap.type = shadowMapType

		if (logRS)
			console.log(
				"%c------> WebGLRenderer > reactive statement! > setShadowMapType!",
				`${css_rs}`,
				{ "shadowMap.enabled": renderer.shadowMap.enabled },
				{ "shadowMap.type": renderer.shadowMap.type }
			)
	}

	/*
    $: if (renderer && props) {
        Propeller.update(renderer, props)
    }
    */

	$: renderer && props ? updateProps() : null

	function updateProps() {
		if (logRS) console.log("%c------> WebGLRenderer > reactive statement! > updateProps!", `${css_rs}`, props)

		// TODO  refactor
		if (propsPrev === undefined) {
			const allKeys = Object.keys(props)
			PropUtils.updateProps(allKeys, props, Propeller.update, renderer)
			propsPrev = { ...props }
		} else {
			const keysOfChangedProps = PropUtils.getChangedKeys(props, propsPrev)
			PropUtils.updateProps(keysOfChangedProps, props, Propeller.update, renderer)
			propsPrev = { ...props }
		}
	}

	export let xr: boolean = undefined

	$: renderer ? setXr() : null

	function setXr() {
		renderer.xr.enabled = xr ? true : false
		if (logRS)
			console.log(
				"%c------> WebGLRenderer > reactive statement! setXr!",
				`${css_rs}`,
				{ xr },
				{ "renderer.xr.enabled": renderer.xr.enabled }
			)
	}

	$: !currentScene && sceneToRenderId ? setCurrentScene() : null

	function setCurrentScene() {
		if (logRS)
			console.log("%c------> WebGLRenderer > reactive statement! > setCurrentScene!", `${css_rs}`, {
				sceneToRenderId
			})
		currentScene = getSceneToRender()
		activateCurrentScene()
	}

	$: !currentCam && currentSceneId ? setCurrentCam() : null

	function setCurrentCam() {
		if (logRS)
			console.log("%c------> WebGLRenderer > reactive statement! > setCurrentCam!", `${css_rs}`, {
				currentSceneId
			})
		currentCam = getCamToRender()
		setCurrentCamActive()
	}

	// TODO  what's this technique? would this trigger on every ... what?
	$: {
		if (logRS)
			console.log(
				"%c------> WebGLRenderer > reactive statement! [TODO ???] > sceneToRenderId !== currentSceneId",
				`${css_rs}`,
				sceneToRenderId !== currentSceneId
			)
		if (sceneToRenderId !== currentSceneId) {
			// won't trigger change if 'currentScene' is not being set, this happens first time onMount()
			if (currentScene) {
				deactivateCurrentScene()
				currentScene = getSceneToRender()
				activateCurrentScene()
			} else {
				//console.warn("SVELTHREE > WebGLRenderer : handle scene switch triggered, currentScene was NOT CHANGED:", {currentScene: currentScene})
			}
		}

		if (logRS)
			console.log(
				"%c------> WebGLRenderer > reactive statement! [TODO ???] > camToRenderId !== currentCamId",
				`${css_rs}`,
				camToRenderId !== currentCamId
			)
		if (camToRenderId !== currentCamId) {
			// won't trigger change if 'currentCam' is not being set, this happens first time onMount()
			if (currentCam) {
				currentCam ? (setCurrentCamInactive(), (currentCam = getCamToRender()), setCurrentCamActive()) : null
			} else {
				//console.warn("SVELTHREE > WebGLRenderer : handle scene switch triggered, currentCam was NOT CHANGED:", {currentCam: currentCam})
			}
		}
	}

	let resizeRendererOnNextFrame = false

	/* TODO  TOFIX  this approach of updating renderer size may delay the animation effect by one frame,
    because this is being triggered AFTER the animationFrame when the scene has already been rendered */
	let storeCanvasDimW: number
	let storeCanvasDimH: number
	$: storeCanvasDimW = $svelthreeStores[sti].canvas.dim.w
	$: storeCanvasDimH = $svelthreeStores[sti].canvas.dim.h
	$: if ((storeCanvasDimW || storeCanvasDimH) && canvas) {
		if (logRS)
			console.log(
				"%c------> WebGLRenderer > reactive statement! [TODO ???] > if storeCanvasDimW || storeCanvasDimH && canvas ",
				`${css_rs}`,
				{ storeCanvasDimW },
				{ storeCanvasDimH }
			)
		//console.info("SVELTHREE > WebGLRenderer : resizeRenderer on canvas.dim change!")
		resizeRendererOnNextFrame = true
	}

	$: if (renderer) {
		if (logRS)
			console.log(
				"%c------> WebGLRenderer > reactive statement! renderer (> startAnimating)",
				`${css_rs}`,
				renderer
			)
		startAnimating()
	}

	onMount(() => {
		if (logInfo) console.info("SVELTHREE > onMount : WebGLRenderer")

		return () => {
			if (logInfo) "SVELTHREE > onDestroy : WebGLRenderer"
			stopAnimating()
		}
	})

	beforeUpdate(() => {
		if (logLC) logCurrentState("%c----> WebGLRenderer > beforeUpdate", css_ba)
	})

	afterUpdate(() => {
		if (logLC) logCurrentState("%c----> WebGLRenderer > afterUpdate", css_aa)
	})

	function logCurrentState(prefix: string, css: string) {
		console.log(`${prefix}!`, `${css}`)
	}

	// TODO  understand. STRANGE: if we run this inside reactive statement instead of the ternary version, there are no shadows ---> ???
	/*
        function createRenderer():void {
            //Spread operator doesn't get transpiled by Svelte, BUG in Edge! see https://github.com/sveltejs/svelte/issues/3052
            //trying with rollup-babel-plugin --> works!
            renderer = new WebGLRenderer({
                canvas: $svelthreeStores[sti].canvas.dom,
                ...config
            })
            rendererPropIterator = new Propeller(renderer)
    }
    */

	function setCurrentCamActive(): void {
		if (logInfo)
			console.info("SVELTHREE > WebGLRenderer : setCurrentCamActive", {
				currentCam: currentCam.type,
				uuid: currentCam.uuid,
				isActive: currentCam.userData.isActive
			})
		currentCam.userData.isActive = true
		$svelthreeStores[sti].cameras[currentCam.userData.indexInCameras].isActive = true
		$svelthreeStores[sti].activeCamera = currentCam
		if (logInfo)
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
		if (logInfo)
			console.info("SVELTHREE > WebGLRenderer : setCurrentCamInactive", {
				currentCam: currentCam.type,
				uuid: currentCam.uuid,
				isActive: currentCam.userData.isActive
			})
		currentCam.userData.isActive = false
		$svelthreeStores[sti].cameras[currentCam.userData.indexInCameras].isActive = false
		if (logInfo)
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

	/*
    function resizeRenderer(tW: number, tH: number, updateStyle:boolean): void {
        console.info("SVELTHREE > WebGLRenderer : resizeRenderer!")
        renderer ? renderer.setSize(tW, tH, updateStyle) : null
    }
    */

	function getSceneToRender(): Scene {
		if (logInfo) console.info("SVELTHREE > WebGLRenderer : getSceneToRender!")
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

	function getCamToRender(): Camera {
		if (logInfo) console.info("SVELTHREE > WebGLRenderer : getCamToRender!")
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
		// resume animations only if scene was being deactivated before
		if (currentScene.userData.isActive === false) {
			currentScene.userData.isActive = true
			$svelthreeStores[sti].scenes[currentScene.userData.indexInScenes].isActive = true

			$svelthreeStores[sti].currentSceneIndex = currentScene.userData.indexInScenes + 1

			/*
             would also work:
             props.scenes[currentScene.userData.indexInScenes].isActive = true
             $svelthreeStores = $svelthreeStores
            */
		} else if (currentScene.userData.isActive === undefined) {
			if (logInfo) console.info(currentScene)

			currentScene.userData.isActive = true
			$svelthreeStores[sti].scenes[currentScene.userData.indexInScenes].isActive = true

			$svelthreeStores[sti].currentSceneIndex = currentScene.userData.indexInScenes + 1

			/*
             would also work
             props.scenes[currentScene.userData.indexInScenes].isActive = true
             $svelthreeStores = $svelthreeStores
            */
		}
	}

	let doAnimate = false
	let rAF: number = undefined

	function startAnimating(): void {
		console.warn("SVELTHREE > WebGLRenderer > startAnimating!")
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
	$: isInteractive = $svelthreeStores[sti].canvas.interactive

	let raycaster: Raycaster
	$: if (isInteractive) {
		if (!raycaster) {
			//console.log("ineractive - raycaster!")
			raycaster = $svelthreeStores[sti].raycaster
		}
	} else {
		raycaster = null
		//console.log("not ineractive - no raycaster!")
	}

	/*
    $: if($svelthreeStores[sti].canvas.interactive) {
        console.log("run 15!")
        raycaster = $svelthreeStores[sti].raycaster
        isInteractive = true
    }
    */

	// $: !$svelthreeStores[sti].canvas.interactive ? ((isInteractive = false), (raycaster = null)) : null

	// ----------------------------------------------

	function changeCursor(doit: boolean): void {
		//pBoolean ? $svelthreeStores[sti].canvas.dom.style.cursor = "$svelthreeStores[sti].pointer" : $svelthreeStores[sti].canvas.dom.style.cursor = "default"
		// Problem with above: canvas triggers reactive statement above because style changes! FIX below

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
			renderStandard()
		} else {
			renderer.setAnimationLoop(renderXR)
		}
	}

	let xrHitTestAR: XRHitTestAR

	async function renderStandard(): Promise<void> {
		if (doAnimate) {
			logOnce ? doLogOnce("renderStandard") : null

			isInteractive
				? (raycaster.setFromCamera($svelthreeStores[sti].pointer.pos, currentCam),
				  (toTest = currentScene.children.filter((child) => child.type === "Mesh")),
				  ($svelthreeStores[sti].allIntersections = raycaster.intersectObjects(toTest, true)))
				: null

			isInteractive ? checkCursor() : null

			// OrbitControls (NonXR)
			// required if controls.enableDamping or controls.autoRotate are set to true
			$svelthreeStores[sti].orbitcontrols ? $svelthreeStores[sti].orbitcontrols.update() : null

			// update cube cameras
			if ($svelthreeStores[sti].cubeCameras.length > 0) {
				for (let i = 0; i < $svelthreeStores[sti].cubeCameras.length; i++) {
					let cubeCamComponent: SvelteComponentDev = $svelthreeStores[sti].cubeCameras[i]
					cubeCamComponent.doUpdate()
				}
			}

			dispatch("before_render")
			dispatch("before_render_int")
			dispatch("before_render_scene")

			// VERY IMPORTANT  THREE  SVELTE :
			// inserting await tick() here enables cross-referencing:
			//
			await tick()

			if (resizeRendererOnNextFrame) {
				renderer.setSize(storeCanvasDimW, storeCanvasDimH, true)
				resizeRendererOnNextFrame = false
			}

			renderer.render(currentScene, currentCam)

			dispatch("after_render")

			rAF = requestAnimationFrame(animate)
		}
	}

	let lastTimeStamp: number

	async function renderXR(time: number, frame: XRFrame): Promise<void> {
		if (doAnimate) {
			logOnce ? doLogOnce("renderXR") : null

			updateCubeCameras()

			dispatch("before_render")
			dispatch("before_render_int")
			dispatch("before_render_scene")

			// VERY IMPORTANT  THREE  SVELTE :
			// inserting await tick() here enables cross-referencing:
			//
			await tick()

			if (frame) {
				let delta: number

				if (lastTimeStamp) {
					delta = time - lastTimeStamp
					lastTimeStamp = time
				} else {
					lastTimeStamp = time
					delta = 0
				}

				$svelthreeStores[sti].xr.currentFrame = {
					timestamp: time,
					delta: delta,
					frame: frame
				}

				dispatch("xrframe", {
					timestamp: time,
					delta: delta,
					frame: frame
				})

				switch ($svelthreeStores[sti].xr.sessionMode) {
					case XRDefaults.SESSION_MODE_INLINE:
						console.error(
							"SVELTHREE > WebGLRenderer > renderXR : XRSessionMode 'inline' is not yet implemented!"
						)
						break
					case XRDefaults.SESSION_MODE_AR:
						//renderAR(timestamp, frame)
						renderAR(frame)
						break
					case XRDefaults.SESSION_MODE_VR:
						break
					default:
						break
				}
			}

			if (resizeRendererOnNextFrame) {
				renderer.setSize(storeCanvasDimW, storeCanvasDimH, true)
				resizeRendererOnNextFrame = false
			}

			renderer.render(currentScene, currentCam)

			dispatch("after_render")
		}
	}

	function doLogOnce(renderMode: string): void {
		logOnce = false
		if (logInfo) {
			console.info(`SVELTHREE > WebGLRenderer > animate : ${renderMode}`, currentScene, currentCam, canvas)
		}
	}

	function updateCubeCameras(): void {
		// update cube cameras
		if ($svelthreeStores[sti].cubeCameras.length > 0) {
			for (let i = 0; i < $svelthreeStores[sti].cubeCameras.length; i++) {
				let cubeCamComponent: SvelteComponentDev = $svelthreeStores[sti].cubeCameras[i]
				cubeCamComponent.doUpdate()
			}
		}
	}

	//function renderAR(timestamp: number = undefined, frame: XRFrame = undefined): void {
	function renderAR(frame: XRFrame = undefined): void {
		//let referenceSpace: XRReferenceSpace = renderer.xr.getReferenceSpace() as XRReferenceSpace
		let session: XRSession = renderer.xr.getSession() as XRSession

		if ($svelthreeStores[sti].xr.hitTestMode === XRDefaults.HITTEST_MODE_REALWORLD) {
			xrHitTestAR.performRealWorldHitTest(session, frame)
		} else if ($svelthreeStores[sti].xr.hitTestResults !== undefined) {
			$svelthreeStores[sti].xr.hitTestResults = undefined
		}
	}

	// public methods

	export function getRenderer(): WebGLRenderer {
		return renderer
	}

	export function getCurrentCamera(): Camera {
		return currentCam
	}

	// TODO  different?

	export function setRender(parameters = { sceneId: "", camId: "" }): void {
		sceneToRenderId = parameters.sceneId
		camToRenderId = parameters.camId
	}
</script>

<XRHitTestAR bind:this={xrHitTestAR} {sti} />
