import {
    Group,
    Event,
    Matrix4,
    Object3D,
    WebXRManager,
    WebXRController,
    BufferGeometry,
    Vector3,
    LineBasicMaterial,
    Line,
    LineDashedMaterial
} from "svelthree-three"
import XRControllerDefaults from "../defaults/XRControllerDefaults"

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
        let lineGeom: BufferGeometry = new BufferGeometry().setFromPoints([new Vector3(0, 0, 0), new Vector3(0, 0, -1)])
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
        console.warn("SessionVR getRayIntersections!")

        let tempMatrix: Matrix4 = new Matrix4()

        tempMatrix.identity().extractRotation(controller.matrixWorld)
        raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld)
        raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix)

        // TODO  will the controller intersect itself like this?
        let toTest = currentScene.children.filter((child: Object3D) => child.type === "Mesh")

        return raycaster.intersectObjects(toTest, true)
    }

    public static createControllers(maxControllers: number, xr: WebXRManager): WebXRController[] {
        let controllers: WebXRController[] = []

        for (let i = 0; i < maxControllers; i++) {
            /* Create new controller directly */
            // WebXRController {_targetRay: null, _grip: null, _hand: null}

            let controller: WebXRController = xr.getControllers[i]

            if (controller === undefined) {
                controller = new WebXRController()
                xr.getControllers[i] = controller
            }

            controllers.push(controller)
        }

        return controllers
    }

    public static applyGrippableConfig(
        grippableConfig: XRInputConfigGrippable,
        handedness: XRHandedness,
        space: Group,
        doEmpty?: boolean
    ): boolean {
        let targetRayConfig: XRControllerTargetRayConfig = undefined

        for (let i = 0; i < grippableConfig.length; i++) {
            let config: XRInputConfigGrippableItem = grippableConfig[i]

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

        if (targetRayConfig) {
            XRControllerUtils.addRayToControllerTargetRaySpace(space, targetRayConfig, doEmpty)
            return true
        } else {
            // remove standard ray
            return false
        }
    }

    public static addRayToControllerTargetRaySpace(
        targetRaySpace: Group,
        targetRayConfig?: XRControllerTargetRayConfig,
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
                let content: Object3D = space.children[i]
                space.remove(content)
            }
        }
    }

    public static getTargetRaySpaceByHandedness(manager: WebXRManager, handedness: XRHandedness): Group {
        for (let i = 0; i < manager.getControllers().length; i++) {
            let targetRaySpace: Group = manager.getController(i)
            let inputSource: XRInputSource = targetRaySpace.userData.xrInputSource

            if (inputSource.handedness === handedness) {
                return targetRaySpace
            }
        }

        return null
    }

    public static getGripSpaceByHandedness(manager: WebXRManager, handedness: XRHandedness): Group {
        for (let i = 0; i < manager.getControllers().length; i++) {
            let targetRaySpace: Group = manager.getController(i)
            let gripSpace: Group = manager.getControllerGrip(i)
            let inputSource: XRInputSource = targetRaySpace.userData.xrInputSource

            if (inputSource.handedness === handedness) {
                return gripSpace
            }
        }

        return null
    }
}
