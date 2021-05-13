<svelte:options accessors />

<!-- 
@component
This is an internal **svelthree** _Camera_ Component.  
 TODO  Link to Docs.
-->
<script lang="ts">
	// #region --- Imports

	import { afterUpdate, beforeUpdate, onMount } from "svelte"
	import type {
		Euler,
		Matrix4,
		Object3D,
		OrthographicCamera,
		PerspectiveCamera,
		Quaternion,
		Scene,
		Vector3
	} from "three"
	import type { SvelthreeAnimationFunction } from "../types-extra"
	import { svelthreeStores } from "../stores"
	import { CameraUtils, PropUtils, SvelthreeProps } from "../utils"
	import SvelthreeAnimation from "./SvelthreeAnimation.svelte"

	const css_rs = "color: red;font-weight:bold;"
	const css_ba = "color: blue;font-weight:bold;"
	const css_aa = "color: green;font-weight:bold;"
	export let logInfo: boolean = false
	export let logRS: boolean = false
	export let logLC: boolean = false

	// #endregion

	// #region --- Required Attributes

	export let scene: Scene
	export let sti: number
	export let cam: OrthographicCamera | PerspectiveCamera
	export let id: string

	// #endregion

	// #region --- Initialization

	let ani: any // 'SvelthreeAnimation' Component's reference

	if (!cam) {
		console.warn("SVELTHREE > Camera : camera was not provided by parent component!", { cam: cam })
		throw new Error("SVELTHREE Exception (see warning above)")
	}

	scene.add(cam)

	if (logInfo)
		console.info("SVELTHREE > Camera : " + cam.type + " was added to scene!", {
			cam: cam,
			scene: scene,
			total: scene.children.length
		})

	cam.userData.id = id
	cam.userData.isActive = false
	cam.userData.indexInCameras = $svelthreeStores[sti].cameras.length

	$svelthreeStores[sti].cameras.push({
		camera: cam,
		id: id,
		isActive: false
	})

	// #endregion

	// #region --- Optional Attributes

	export let mau: boolean = undefined

	// we can do this, because 'userData.matrixAutoUpdate' can be 'undefined'
	$: if (cam) {
		cam.matrixAutoUpdate = mau ? true : false
	}

	export let pos: Vector3 | Parameters<Vector3["set"]> = undefined
	export let rot:
		| Euler
		| Parameters<Euler["set"]>
		| Quaternion
		| Parameters<Quaternion["set"]>
		| Vector3
		| Parameters<Vector3["set"]> = undefined
	export let quat: Quaternion | Parameters<Quaternion["set"]> = undefined

	export let lookAt: Vector3 | Parameters<Vector3["set"]> | Object3D = undefined

	/**
	 * ☝️ If `matrix` attribute is provided, `pos`, `rot`, `scale` attributes as well as any provided transform props will be overridden!
	 */
	export let matrix: Matrix4 | Parameters<Matrix4["set"]> = undefined

	export let frustumSize: number = undefined

	export let animation: SvelthreeAnimationFunction = undefined
	export let aniauto: boolean = undefined

	let sProps: SvelthreeProps
	$: !sProps && cam ? (sProps = new SvelthreeProps(cam)) : null

	// accept anything from a specific cam
	export let props: { [key: string]: any } = undefined

	//$: props && sProps ? sProps.update(props) : null
	$: props && sProps ? updateProps() : null

	function updateProps() {
		if (logRS) console.log("%c*--------> Camera > reactive statement! props", `${css_rs}`, props)
		sProps.update(props)
	}

	$: props && cam ? onProps() : null

	/**
	 * Displays a warning on prop update.
	 * Props are being updated via `SvelthreeProps`utility.
	 */
	function onProps() {
		if (frustumSize !== undefined) {
			//CameraUtils.logOrthoCamFrustumWarnings(props.left, props.right, props.top, props.bottom)
		}
	}

	export let helper: boolean = undefined

	// #endregion

	// #region --- Reactiveness

	/*
    $: !matrix && cam && pos ? tryOrbitControlsUpdate() : null
    */

	/*
    let camMatrix: Matrix4 = new Matrix4()
    $: cam ? camMatrix.copy(cam.matrixWorld) : null

    // TODO check one more time with orbit controls on
    afterUpdate(() => {
        console.info("SVELTHREE > Camera : afterUpdate!")
        tryOrbitControlsUpdate()
    })

    function tryOrbitControlsUpdate() {
        if ($svelthreeStores[sti].orbitcontrols) {
            if (camMatrix.equals(cam.matrixWorld)) {
            } else {
                console.warn("SVELTHREE > Camera > tryOrbitControlsUpdate > should update.")
                $svelthreeStores[sti].orbitcontrols.update()
                camMatrix.copy(cam.matrixWorld)
            }
        }
    }
    */

	//#region --- 'Object3D' Specific Code

	const w_sh = PropUtils.getShortHandAttrWarnings(`SVELTHREE > ${cam.type} >`)
	const wrn = PropUtils.warn

	//$: !matrix && cam && pos ? PropUtils.setPositionFromValue(cam, pos) : pos && cam ? wrn(w_sh.pos) : null
	$: !matrix && cam && pos ? setPositionFromValue() : pos && cam ? wrn(w_sh.pos) : null

	function setPositionFromValue() {
		if (logRS) console.log("%c*--------> Camera > reactive statement! pos", `${css_rs}`, pos)
		PropUtils.setPositionFromValue(cam, pos)
	}

	//$: !matrix && !quat && cam && rot ? PropUtils.setRotationFromValue(cam, rot) : rot && cam ? wrn(w_sh.rot) : null
	$: !matrix && !quat && cam && rot ? setRotationFromValue() : rot && cam ? wrn(w_sh.rot) : null

	function setRotationFromValue() {
		if (logRS) console.log("%c*--------> Camera > reactive statement! rot", `${css_rs}`, rot)
		PropUtils.setRotationFromValue(cam, rot)
	}

	//$: !matrix && cam && quat ? PropUtils.setQuaternionFromValue(cam, quat) : quat && cam ? wrn(w_sh.quat) : null
	$: !matrix && cam && quat ? setQuaternionFromValue() : quat && cam ? wrn(w_sh.quat) : null

	function setQuaternionFromValue() {
		if (logRS) console.log("%c*--------> Camera > reactive statement! quat", `${css_rs}`, quat)
		PropUtils.setQuaternionFromValue(cam, quat)
	}

	// RECONSIDER  TODO  currently not using 'scale' in cameras
	//$: !matrix && cam && scale ? PropUtils.setScaleFromValue(cam, scale) : scale && cam ? wrn(w_sh.scale) : null

	//$: !matrix && cam && lookAt ? PropUtils.setLookAtFromValue(cam, lookAt) : lookAt && cam ? wrn(w_sh.lookAt) : null
	$: !matrix && cam && lookAt ? setLookAtFromValue() : lookAt && cam ? wrn(w_sh.lookAt) : null

	function setLookAtFromValue() {
		if (logRS) console.log("%c*--------> Camera > reactive statement! lookAt", `${css_rs}`, lookAt)
		PropUtils.setLookAtFromValue(cam, lookAt)
	}

	//$: matrix && cam ? PropUtils.setMatrixFromValue(cam, matrix) : null
	$: matrix && cam ? setMatrixFromValue() : null

	function setMatrixFromValue() {
		if (logRS) console.log("%c*--------> Camera > reactive statement! matrix", `${css_rs}`, matrix)
		PropUtils.setMatrixFromValue(cam, matrix)
	}

	//#endregion

	// helper

	// call this to remove the renderer component listener
	let removeHelperUpdateListener: () => void

	// generally updating helper 'beforeRender' / on 'render'
	$: helper && cam && $svelthreeStores[sti].rendererComponent ? startUpdatingHelper() : stopUpdatingHelper()

	function startUpdatingHelper() {
		if (!removeHelperUpdateListener) {
			removeHelperUpdateListener = $svelthreeStores[sti].rendererComponent.$on(
				"before_render_int",
				updateCamHelper
			)
		}
	}

	function updateCamHelper() {
		// if we do this only if `.matrixAutoUpdate === false`, the helper is not 100% in sync.
		// this approach is bulletproof for all scene / matrix update modes.
		cam.updateMatrix()
		cam.updateMatrixWorld()
		CameraUtils.updateHelper(cam)
	}

	function stopUpdatingHelper() {
		if (removeHelperUpdateListener) {
			removeHelperUpdateListener()
			removeHelperUpdateListener = undefined
		}
	}

	// reactive animation handling (has to be enabled as last, so that initial animation state overrides props)

	let currentSceneActive = false
	$: currentSceneActive = $svelthreeStores[sti].scenes[scene.userData.indexInScenes]?.isActive

	let animationEnabled = false
	$: animationEnabled = animation ? true : false

	// #endregion

	// #region --- Public Methods

	export function removeCameraFromParent(): void {
		cam.parent.remove(cam)
	}

	export function getCamera(): THREE.Camera {
		return $svelthreeStores[sti].cameras[cam.userData.indexInCameras].camera
	}

	export function getIndexInCameras(): number {
		return $svelthreeStores[sti].cameras[cam.userData.indexInCameras].camera.userData.indexInCameras
	}

	export function getSTI(): number {
		return sti
	}

	export function getScene(): Scene {
		return scene
	}

	// #endregion

	// #region --- Animation Related Public Methods

	export function getAnimation(): any {
		return ani.getAnimation()
	}

	export function startAni(): void {
		ani.startAni()
	}

	// #endregion

	// #region --- Interaction

	// TODO  Add ability to add Camera to an Interaction-Dummy (Mesh) like with Lights

	// #endregion

	// #region --- Lifecycle

	export let fnOnMount: any = undefined

	onMount(
		fnOnMount
			? () => fnOnMount(self)
			: () => {
					if (logLC) logCurrentState(`*----> Camera > onMount`, null)
					if (logInfo) console.info("SVELTHREE > onMount : Camera")
					console.warn("SVELTHREE > onMount : Camera : cam.matrixAutoUpdate", cam.matrixAutoUpdate)

					return () => {
						if (logInfo) console.info("SVELTHREE > onDestroy : Camera")
						removeCameraFromParent()
					}
			  }
	)

	afterUpdate(() => {
		if (logLC) logCurrentState("%c*------> Camera > afterUpdate", css_aa)
		if (cam.matrixWorldNeedsUpdate === false) {
			cam.matrixAutoUpdate = mau
		}
	})

	beforeUpdate(() => {
		if (logLC) logCurrentState("%c*------> Camera > beforeUpdate", css_ba)
	})

	function logCurrentState(prefix: string, css: string) {
		console.log(`${prefix}!`, `${css}`)
	}

	// #endregion
</script>

<SvelthreeAnimation
	bind:this={ani}
	bind:currentSceneActive
	{animationEnabled}
	{animation}
	{aniauto}
	obj={cam}
	{scene} />
