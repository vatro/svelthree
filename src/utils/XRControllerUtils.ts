import XRControllerDefaults from "../defaults/XRControllerDefaults"
import { Group, Event, Matrix4, Object3D, WebXRManager } from "svelthree-three"

export default class XRControllerUtils {
    constructor() {}

    public static addListeners(controller: Group, listener: (event: Event) => void) {
        controller.addEventListener("select", listener)
        controller.addEventListener("selectstart", listener)
        controller.addEventListener("selectend", listener)
        controller.addEventListener("squeeze", listener)
        controller.addEventListener("squeezestart", listener)
        controller.addEventListener("squeezeend", listener)
    }

    public static getRayIntersections(raycaster: Raycaster, currentScene: Scene, controller: Group): any[] {
        console.warn("SessionVR performVirtualHitTest!")

        let tempMatrix: Matrix4 = new Matrix4()

        tempMatrix.identity().extractRotation(controller.matrixWorld)
        raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld)
        raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix)

        // TODO  will the controller intersect itself like this?
        let toTest = currentScene.children.filter((child: Object3D) => child.type === "Mesh")

        return raycaster.intersectObjects(toTest, true)
    }

    public static getControllers(maxControllers: number, xr: WebXRManager): Group[] {
        let controllers: Group[] = []

        for (let i = 0; i < maxControllers; i++) {
            let controller: Group = xr.getController(i)

            if (i === XRControllerDefaults.INDEX_LEFT) {
                controller.name = XRControllerDefaults.CONTROLLER_NAME_LEFT
                controller.userData.handedness = XRControllerDefaults.HANDEDNESS_LEFT
            }

            if (i === XRControllerDefaults.INDEX_RIGHT) {
                controller.name = XRControllerDefaults.CONTROLLER_NAME_RIGHT
                controller.userData.handedness = XRControllerDefaults.HANDEDNESS_RIGHT
            }

            controllers.push(controller)
        }

        return controllers
    }
}
