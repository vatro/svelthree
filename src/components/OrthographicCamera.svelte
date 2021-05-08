<!-- 
@component
**svelthree** _OrthographicCamera_ Component.  
☝️ In order to configure / update the [OrthographicCamera]((https://threejs.org/docs/#api/en/cameras/OrthographicCamera)), you should one of these approaches without mixing them:  
- [ *recommended* ] Use `frustumSize` and `props` attributes : This way the frustum planes positions will be calculated automatically so the camera always fits the canvas size. 
If you use this approach you'll see a warning in the console if you define left, right, top and bottom properties inside `props` attribute.
- Use `params` attribute to initialize the camera and `props` attribute to mutate it's properties.
- Use `props` attribute only: Camera will be initialized with default constructor values and `props` attribute will mutate it's properties.
 TODO  Link to Docs.
-->
<script lang="ts">
	// #region --- Imports

	import { afterUpdate, beforeUpdate, onMount } from "svelte"
	import type { Object3D } from "svelthree-three"
	import { CameraHelper, Euler, Matrix4, OrthographicCamera, Quaternion, Scene, Vector3 } from "svelthree-three"
	import { Camera } from "../components-internal"
	import type { OnlyWritableNonFunctionPropsPlus, PropBlackList, SvelthreeAnimationFunction } from "../types-extra"
	import { svelthreeStores } from "../stores"
	import { CameraUtils, StoreUtils } from "../utils"

	const css_rs = "color: red;font-weight:bold;"
	const css_ba = "color: blue;font-weight:bold;"
	const css_aa = "color: green;font-weight:bold;"
	export let logInfo: boolean = false
	export let logRS: boolean = false
	export let logLC: boolean = false

	// #endregion

	// #region --- Required Attributes

	export let scene: Scene
	const sti: number = StoreUtils.getSTIfromScene(scene, "OrthographicCamera")

	export let id: string = undefined

	export let mau: boolean = undefined

	if (!id) {
		console.warn(
			"SVELTHREE > OrthographicCamera : you have to provide an 'id' prop (not empty String) for Cameras in order to assign them to a 'WebGLRenderer' component!",
			{ id: id }
		)
		throw new Error("SVELTHREE Exception (see warning above)")
	}

	// #endregion

	// #region --- Optional Attributes

	/**
     * The value of `frustumSize` is being used for automatic calculation of default left, right, top and bottom frustum planes:
     * ```
        cam.left = (frustumSize * aspect) / -2
        cam.right = (frustumSize * aspect) / 2
        cam.top = frustumSize / 2
        cam.bottom = frustumSize / -2
     * ```
     * The value of `aspect` is being internally calculated based on current dimensions of the Canvas component (canvas.w / canvas.h).   
    */
	export let frustumSize: number = undefined

	/**
	 * Initializes the OrthographicCamera with user provided three.js-native [OrthographicCamera](https://threejs.org/docs/#api/en/cameras/OrthographicCamera) constructor parameters.
	 *
	 * Usage: `params={[...]}`
	 *
	 * ☝️ *This is an alternative to using the `frustumSize` attribute, so you'll have to manage the frustum plane positions by yourself.*
	 */
	export let params: ConstructorParameters<typeof OrthographicCamera> = undefined

	export let pos: Vector3 | Parameters<Vector3["set"]> = undefined
	export let rot:
		| Euler
		| Parameters<Euler["set"]>
		| Quaternion
		| Parameters<Quaternion["set"]>
		| Vector3
		| Parameters<Vector3["set"]> = undefined
	export let quat: Quaternion = undefined

	export let lookAt: Vector3 | Parameters<Vector3["set"]> | Object3D = undefined

	/**
	 * ☝️ If `matrix` attribute is provided, `pos`, `rot`, `scale` attributes as well as any provided transform props will be overridden!
	 */
	export let matrix: Matrix4 | Parameters<Matrix4["set"]> = undefined

	export let animation: SvelthreeAnimationFunction = undefined
	export let aniauto = false

	/** Creates and adds a CameraHelper. */
	export let helper: boolean = undefined

	$: cam && !cam.userData.helper && helper ? CameraUtils.createHelper(cam, scene) : null
	$: cam && cam.userData.helper && !helper ? CameraUtils.removeHelper(cam, scene) : null

	type OrthographicCameraProps = OnlyWritableNonFunctionPropsPlus<
		Omit<OrthographicCamera, PropBlackList>,
		{
			lookAt: Vector3 | Parameters<Vector3["set"]> | Object3D
			position?: Vector3 | Parameters<Vector3["set"]>
			rotation?:
				| Euler
				| Parameters<Euler["set"]>
				| Quaternion
				| Parameters<Quaternion["set"]>
				| Vector3
				| Parameters<Vector3["set"]>
			quaternion?: Quaternion | Parameters<Quaternion["set"]>
			matrix?: Matrix4 | Parameters<Matrix4["set"]>
		}
	>

	/** Writable, non-function OrthographicCamera properties only incl. an additional `lookAt` property. */
	export let props: { [P in keyof OrthographicCameraProps]: OrthographicCameraProps[P] } = undefined

	// #endregion

	// #region --- Initialization

	// Camera component's reference
	let camera: Camera

	const defaultParams: ConstructorParameters<typeof OrthographicCamera> = CameraUtils.getOrthoCamDefaultParams(
		frustumSize
	)

	let cam: OrthographicCamera

	if (params && params.length > 0) {
		cam = new OrthographicCamera(...params)
	} else {
		cam = new OrthographicCamera(...defaultParams)
	}

	// #endregion

	// #region --- Reactiveness
	let canvas: HTMLCanvasElement = undefined
	$: canvas = $svelthreeStores[sti].canvas.dom

	let canvasW: number
	let canvasH: number

	$: canvasW = $svelthreeStores[sti].canvas.dim.w
	$: canvasH = $svelthreeStores[sti].canvas.dim.h

	// Executed on Canvas dimensions change
	$: if ((canvasW || canvasH) && canvas) {
		CameraUtils.updateOtrhoCam(cam, frustumSize, canvasW, canvasH)
	}

	$: frustumSize && cam ? CameraUtils.updateOtrhoCam(cam, frustumSize, canvasW, canvasH) : null

	// #endregion

	// #region --- Public Methods

	export function getId(): string {
		return id
	}

	export function getSTI(): number {
		return sti
	}

	export function getCamera(): THREE.Camera {
		return camera.getCamera()
	}

	export function getIndexInCameras(): number {
		return camera.getIndexInCameras()
	}

	export function getHelper(): CameraHelper {
		return cam.userData.helper as CameraHelper
	}

	export function setHelperAttr(enabled: boolean): void {
		helper = enabled
	}

	export function getHelperAttr(): boolean {
		return helper
	}

	// #endregion

	// #region --- Lifecycle

	onMount(() => {
		if (logLC) logCurrentState(`----> OrthographicCamera > onMount`, null)
		if (logInfo) console.info("SVELTHREE > onMount : " + cam.type)
		return () => {
			if (logInfo) console.info("SVELTHREE > onDestroy : " + cam.type)
			CameraUtils.removeHelper(cam, scene)
		}
	})

	beforeUpdate(() => {
		logCurrentState("%c------> OrthographicCamera > beforeUpdate", css_ba)
	})

	afterUpdate(() => {
		logCurrentState("%c------> OrthographicCamera > afterUpdate", css_aa)
	})

	function logCurrentState(prefix: string, css: string) {
		if (logInfo) console.log(`${prefix}!`, `${css}`)
	}
	// #endregion
</script>

<Camera
	bind:this={camera}
	{scene}
	{sti}
	{cam}
	{id}
	{mau}
	{helper}
	{pos}
	{rot}
	{quat}
	{lookAt}
	{matrix}
	{frustumSize}
	{props}
	{animation}
	{aniauto}
	{logInfo}
	{logRS}
	{logLC} />
