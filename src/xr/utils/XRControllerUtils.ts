import {
	Group,
	Event,
	Matrix4,
	Object3D,
	WebXRManager,
	BufferGeometry,
	Vector3,
	LineBasicMaterial,
	Line,
	LineDashedMaterial,
	Raycaster,
	Scene
} from "three"

import type { WebXRController } from "three"

import type { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader"

import { XRControllerModelFactory } from "three/examples/jsm/webxr/XRControllerModelFactory"
import type { XRControllerModel } from "three/examples/jsm/webxr/XRControllerModelFactory"

import { XRControllerDefaults } from "../constants"
import type {
	XrControllerTargetRayConfig,
	XrInputConfigGrippable,
	XrInputConfigGrippableItem,
	XrSessionVRInputConfig
} from "../types-svelthree"
import type { XRHandedness, XRInputSource } from "../types-webxr"

export default class XRControllerUtils {
	constructor() {}

	public static addListeners(targetRaySpace: Group, listener: (event: Event) => void) {
		targetRaySpace.addEventListener("select", listener)
		targetRaySpace.addEventListener("selectstart", listener)
		targetRaySpace.addEventListener("selectend", listener)
		targetRaySpace.addEventListener("squeeze", listener)
		targetRaySpace.addEventListener("squeezestart", listener)
		targetRaySpace.addEventListener("squeezeend", listener)
	}

	public static removeListeners(targetRaySpace: Group, listener: (event: Event) => void) {
		targetRaySpace.removeEventListener("select", listener)
		targetRaySpace.removeEventListener("selectstart", listener)
		targetRaySpace.removeEventListener("selectend", listener)
		targetRaySpace.removeEventListener("squeeze", listener)
		targetRaySpace.removeEventListener("squeezestart", listener)
		targetRaySpace.removeEventListener("squeezeend", listener)
	}

	static getControllerRay(
		name?: string,
		material?: LineBasicMaterial | LineDashedMaterial,
		scaleZ?: number
	): Object3D {
		const lineGeom: BufferGeometry = new BufferGeometry().setFromPoints([
			new Vector3(0, 0, 0),
			new Vector3(0, 0, -1)
		])
		let lineMat: LineBasicMaterial | LineDashedMaterial

		material ? (lineMat = material) : (lineMat = new LineBasicMaterial({ color: 0xc53030, linewidth: 2 }))
		const targetRay = new Line(lineGeom, lineMat)
		if (lineMat instanceof LineDashedMaterial) {
			targetRay.computeLineDistances()
		}

		name ? (targetRay.name = name) : (targetRay.name = "target ray")
		scaleZ ? (targetRay.scale.z = scaleZ) : (targetRay.scale.z = 5)

		return targetRay
	}

	public static getRayIntersections(raycaster: Raycaster, currentScene: Scene, controller: Group): any[] {
		console.warn("SVELTHREE > SessionVR > XRControllerUtils > getRayIntersections!")

		const tempMatrix: Matrix4 = new Matrix4()

		tempMatrix.identity().extractRotation(controller.matrixWorld)
		raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld)
		raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix)

		// TODO  will the controller intersect itself like this?
		const toTest = currentScene.children.filter((child: Object3D) => child.type === "Mesh")

		return raycaster.intersectObjects(toTest, true)
	}

	// TOFIX  missing xr.getControllers() see https://github.com/mrdoob/three.js/pull/21815
	public static createControllers(maxControllers: number, xr: WebXRManager): WebXRController[] {
		const controllers: WebXRController[] = []

		for (let i = 0; i < maxControllers; i++) {
			/* Create new controller directly */
			// WebXRController {_targetRay: null, _grip: null, _hand: null}

			let controller: WebXRController = xr.getControllers()[i]

			if (controller === undefined) {
				controller = new WebXRController()
				xr.getControllers()[i] = controller
			}

			controllers.push(controller)
		}

		return controllers
	}

	public static getInputConfigGrippable(inputConfig: XrSessionVRInputConfig): XrInputConfigGrippable {
		for (let i = 0; i < inputConfig.length; i++) {
			const c = inputConfig[i]
			if (c.type === "grippable") {
				return c.config as XrInputConfigGrippable
			}
		}

		return null
	}

	public static applyGrippableConfig(
		grippableConfig: XrInputConfigGrippable,
		gripSpace: Group,
		handedness: XRHandedness
	): boolean {
		let useGrip: boolean = false

		for (let i = 0; i < grippableConfig.length; i++) {
			let config: XrInputConfigGrippableItem = grippableConfig[i]

			if (config.controller === XRControllerDefaults.ENABLED_BOTH || handedness === config.controller) {
				config.useGrip ? (gripSpace.userData.useGrip = config.useGrip) : (gripSpace.userData.useGrip = null)
				config.grip ? (gripSpace.userData.gripConfig = config.grip) : (gripSpace.userData.gripConfig = null)

				config.useGrip ? (useGrip = true) : null
			}
		}

		return useGrip
	}

	public static addGripModelCheck(gripSpace: Group): boolean {
		const existingGripModels: XRControllerModel[] = XRControllerUtils.getAllControllerModelsInside(gripSpace)

		if (existingGripModels.length === 0) {
			if (gripSpace.userData.gripConfig === null) {
				return true
			}
		} else {
			if (existingGripModels.length === 1) {
				console.warn(
					"SVELTHREE > SessionVR > XRControllerUtils > addGripModelCheck : XRControllerdModel is already existing inside gripSpace! ",
					gripSpace
				)
			}

			if (existingGripModels.length > 1) {
				// This shouldn't happen -->  TODO  Is there a scenario where we want to use more than one hand model?
				console.error(
					"SVELTHREE > SessionVR > XRControllerUtils > addGripModelCheck : There are more than one XRControllerdModels inside gripSpace! ",
					gripSpace
				)
			}
		}

		return false
	}

	public static addNewXRControllerModelToSpace(gripSpace: Group, gltfLoader?: GLTFLoader): XRControllerModel {
		console.warn("SVELTHREE > SessionVR > XRControllerUtils > addNewXRControllerModelToSpace!", gripSpace)

		// TODO  We could pass a custom GLTF-Loader to the XRControllerModelFactory, but it doesn't seem to be implemented fully in 119 (?)
		const controllerModelFactory: XRControllerModelFactory = new XRControllerModelFactory(gltfLoader)

		const gripModel = controllerModelFactory.createControllerModel(gripSpace)

		gripSpace.add(gripModel)

		return gripModel
	}

	public static removeAllExistingXRControllerModelsFromSpace(gripSpace: Group) {
		const existingControllerModels: XRControllerModel[] = XRControllerUtils.getAllControllerModelsInside(gripSpace)

		if (existingControllerModels.length > 0) {
			// This shouldn't happen -->  TODO  Is there a scenario where we want to use more than one controller model?
			console.error(
				"SVELTHREE > SessionVR > onGripSpaceConnected : Deleting all existing XRControllerModels from grip space! ",
				gripSpace,
				existingControllerModels
			)

			// remove all existing grip models,because we don't need them / we don't use grip (anymore)

			for (let i = existingControllerModels.length - 1; i >= 0; i--) {
				gripSpace.remove(existingControllerModels[i])
			}
		}
	}

	public static applyTargetRayConfig(
		grippableConfig: XrInputConfigGrippable,
		handedness: XRHandedness,
		space: Group,
		doEmpty?: boolean
	): void {
		let targetRayConfig: XrControllerTargetRayConfig = undefined

		for (let i = 0; i < grippableConfig.length; i++) {
			let config: XrInputConfigGrippableItem = grippableConfig[i]

			if (config.targetRay) {
				if (config.controller === XRControllerDefaults.ENABLED_BOTH) {
					targetRayConfig = config.targetRay
				} else if (
					handedness === XRControllerDefaults.ENABLED_LEFT &&
					config.controller === XRControllerDefaults.ENABLED_LEFT
				) {
					targetRayConfig = config.targetRay
				} else if (
					handedness === XRControllerDefaults.ENABLED_RIGHT &&
					config.controller === XRControllerDefaults.ENABLED_RIGHT
				) {
					targetRayConfig = config.targetRay
				}
			}
		}

		if (targetRayConfig) {
			XRControllerUtils.addRayToControllerTargetRaySpace(space, targetRayConfig, doEmpty)
		} else {
			// don't add ray
			console.warn(
				"SVELTHREE > SessionVR > XRControllerUtils > applyTargetRayConfig : Controller will have no visible target for provided configuration! ",
				grippableConfig
			)
		}
	}

	public static addRayToControllerTargetRaySpace(
		targetRaySpace: Group,
		targetRayConfig?: XrControllerTargetRayConfig,
		doEmpty?: boolean
	) {
		if (doEmpty) {
			XRControllerUtils.clearControllerSpace(targetRaySpace)
		}

		let controllerRay: Object3D

		if (targetRayConfig) {
			controllerRay = XRControllerUtils.getControllerRay(
				targetRayConfig.name,
				targetRayConfig.material,
				targetRayConfig.scaleZ
			)
		} else {
			controllerRay = XRControllerUtils.getControllerRay()
		}

		targetRaySpace.add(controllerRay)
	}

	public static clearControllerSpace(space: Group) {
		if (space.children.length > 0) {
			for (let i = space.children.length - 1; i >= 0; i--) {
				const content: Object3D = space.children[i]
				space.remove(content)
			}
		}
	}

	// TOFIX  missing xr.getControllers() see https://github.com/mrdoob/three.js/pull/21815
	public static getTargetRaySpaceByHandedness(manager: WebXRManager, handedness: XRHandedness): Group {
		for (let i = 0; i < manager.getControllers().length; i++) {
			const targetRaySpace: Group = manager.getController(i)
			const inputSource: XRInputSource = targetRaySpace.userData.xrInputSource

			if (inputSource.handedness === handedness) {
				return targetRaySpace
			}
		}

		return null
	}

	// TOFIX  missing xr.getControllers() see https://github.com/mrdoob/three.js/pull/21815
	public static getGripSpaceByHandedness(manager: WebXRManager, handedness: XRHandedness): Group {
		for (let i = 0; i < manager.getControllers().length; i++) {
			const controller: WebXRController = manager.getControllers()[i]

			// we can get gripSpace directly from controller in order to prevent using manager.getControllerGrip(i), which will create a new gripSpace, but we may not want that.
			let gripSpaceAvailable: boolean = controller.hasOwnProperty("_grip") ? true : false

			if (gripSpaceAvailable) {
				const gripSpace: Group = manager.getControllerGrip(i)
				const inputSource: XRInputSource = gripSpace.userData.xrInputSource

				if (inputSource.handedness === handedness) {
					return gripSpace
				}
			}
		}

		return null
	}

	public static tryAddingSpaceToScene(space: Group, scene: Scene) {
		if (space.parent !== scene) {
			scene.add(space)
		} else {
			console.warn(
				"SVELTHREE > SessionVR > XRControllerUtils > tryAddingSpaceToScene : Provided space was already added to the Scene!",
				{
					space: space,
					xrInputSource: space.userData.xrInputSource
				}
			)
		}
	}

	public static tryRemovingSpaceFromScene(space: Group, scene: Scene) {
		if (space.parent === scene) {
			scene.remove(space)
		} else {
			console.warn(
				"SVELTHREE > SessionVR > XRControllerUtils > tryRemovingSpaceFromScene : Provided space is not a child of the Scene!",
				{
					space: space,
					xrInputSource: space.userData.xrInputSource
				}
			)
		}
	}

	public static getAllControllerModelsInside(gripSpace: Group): XRControllerModel[] {
		const controllerModels: XRControllerModel[] = []

		for (let i = 0; i < gripSpace.children.length; i++) {
			let child: any = gripSpace.children[i]

			if (child instanceof XRControllerModel) {
				controllerModels.push(child as XRControllerModel)
			}
		}

		return controllerModels
	}
}
