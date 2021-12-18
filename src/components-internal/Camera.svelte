<!--
`accessors:true` hast to be set per component because of the svelte-language-server bug, otherwise accessors would be falsely detected as missing and highlighted as errors.
svelthree uses svelte-accmod, where accessors are always `true`, regardless of `svelte:options`.  
-->
<svelte:options accessors />

<!-- 
@component
This is an internal **svelthree** _Camera_ Component.  
[ tbd ]  Link to Docs.
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
	import { get_current_component } from "svelte/internal"
	import { c_rs_int, c_dev, c_lc_int, c_mau, verbose_mode, get_comp_name_int } from "../utils/SvelthreeLogger"
	import type { LogLC, LogDEV } from "../utils/SvelthreeLogger"

	const c_name = get_comp_name_int(get_current_component())
	const verbose: boolean = verbose_mode()

	export let log_dev: { [P in keyof LogDEV]: LogDEV[P] } = undefined
	export let log_rs: boolean = false
	export let log_lc: { [P in keyof LogLC]: LogLC[P] } = undefined
	export let log_mau: boolean = false

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

	if (verbose && log_dev) {
		console.debug(
			...c_dev(c_name, `${cam.type} was added to scene!`, {
				cam: cam,
				scene: scene,
				total: scene.children.length
			})
		)
	}

	cam.userData.id = id
	cam.userData.isActive = false
	cam.userData.indexInCameras = $svelthreeStores[sti].cameras.length

	debugger

	$svelthreeStores[sti].cameras.push({
		camera: cam,
		id: id,
		isActive: false
	})

	// #endregion

	// #region --- Optional Attributes

	export let mau: boolean = undefined
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
		if (verbose && log_rs) console.debug(...c_rs_int(c_name, "props", props))
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
         if (verbose && log_lc && (log_lc.all || log_lc.au)) console.info(...c_lc_int(c_name, "afterUpdate"))
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

	//$: !matrix && cam && pos ? PropUtils.setPositionFromValue(cam, pos) : pos && cam ? console.warn(w_sh.pos) : null
	$: !matrix && cam && pos ? setPositionFromValue() : pos && cam ? console.warn(w_sh.pos) : null

	function setPositionFromValue() {
		if (verbose && log_rs) console.debug(...c_rs_int(c_name, "pos", pos))
		PropUtils.setPositionFromValue(cam, pos)
	}

	//$: !matrix && !quat && cam && rot ? PropUtils.setRotationFromValue(cam, rot) : rot && cam ? console.warn(w_sh.rot) : null
	$: !matrix && !quat && cam && rot ? setRotationFromValue() : rot && cam ? console.warn(w_sh.rot) : null

	function setRotationFromValue() {
		if (verbose && log_rs) console.debug(...c_rs_int(c_name, "rot", rot))
		PropUtils.setRotationFromValue(cam, rot)
	}

	//$: !matrix && cam && quat ? PropUtils.setQuaternionFromValue(cam, quat) : quat && cam ? console.warn(w_sh.quat) : null
	$: !matrix && cam && quat ? setQuaternionFromValue() : quat && cam ? console.warn(w_sh.quat) : null

	function setQuaternionFromValue() {
		if (verbose && log_rs) console.debug(...c_rs_int(c_name, "quat", quat))
		PropUtils.setQuaternionFromValue(cam, quat)
	}

	// RECONSIDER  TODO  currently not using 'scale' in cameras
	//$: !matrix && cam && scale ? PropUtils.setScaleFromValue(cam, scale) : scale && cam ? console.warn(w_sh.scale) : null

	//$: !matrix && cam && lookAt ? PropUtils.setLookAtFromValue(cam, lookAt) : lookAt && cam ? console.warn(w_sh.lookAt) : null
	$: !matrix && cam && lookAt ? setLookAtFromValue() : lookAt && cam ? console.warn(w_sh.lookAt) : null

	function setLookAtFromValue() {
		if (verbose && log_rs) console.debug(...c_rs_int(c_name, "lookAt", lookAt))
		PropUtils.setLookAtFromValue(cam, lookAt)
	}

	//$: matrix && cam ? PropUtils.setMatrixFromValue(cam, matrix) : null
	$: matrix && cam ? setMatrixFromValue() : null

	function setMatrixFromValue() {
		if (verbose && log_rs) console.debug(...c_rs_int(c_name, "matrix", matrix))
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
					if (verbose && log_lc && (log_lc.all || log_lc.om)) console.info(...c_lc_int(c_name, "onMount"))
					if (verbose && log_mau) {
						console.debug(
							...c_mau(c_name, "onMount : cam.", {
								matrixAutoUpdate: cam.matrixAutoUpdate,
								matrixWorldNeedsUpdate: cam.matrixWorldNeedsUpdate
							})
						)
					}

					return () => {
						if (verbose && log_lc) console.info(...c_lc_int(c_name, "onDestroy"))
						removeCameraFromParent()
					}
			  }
	)

	beforeUpdate(() => {
		if (verbose && log_lc && (log_lc.all || log_lc.bu)) console.info(...c_lc_int(c_name, "beforeUpdate"))
		if (verbose && log_mau) {
			console.debug(
				...c_mau(c_name, "beforeUpdate : cam.", {
					matrixAutoUpdate: cam.matrixAutoUpdate,
					matrixWorldNeedsUpdate: cam.matrixWorldNeedsUpdate
				})
			)
		}
	})

	afterUpdate(() => {
		if (verbose && log_lc && (log_lc.all || log_lc.om)) console.info(...c_lc_int(c_name, "afterUpdate"))
		if (verbose && log_mau) {
			console.debug(
				...c_mau(c_name, "afterUpdate : cam.", {
					matrixAutoUpdate: cam.matrixAutoUpdate,
					matrixWorldNeedsUpdate: cam.matrixWorldNeedsUpdate
				})
			)
		}
	})

	// #endregion
</script>

<SvelthreeAnimation
	bind:this={ani}
	bind:currentSceneActive
	{animationEnabled}
	{animation}
	{aniauto}
	obj={cam}
	{scene}
/>
