import { Vector3 } from "three";
import type {  PerspectiveCamera, OrthographicCamera } from "three";

export default class Calc {
  constructor() {}

  public static get_unproject_pointer(c:HTMLCanvasElement, e:PointerEvent, cam:PerspectiveCamera | OrthographicCamera): Vector3 {
      let rect: DOMRect = c.getBoundingClientRect()

      const px = ((e.clientX - rect.left) / (rect.right - rect.left)) * 2 - 1
      const py = -((e.clientY - rect.top) / (rect.bottom - rect.top)) * 2 + 1

      if (cam.type === "PerspectiveCamera") {
        // Perspective Camera
        // see: https://stackoverflow.com/questions/13055214/mouse-canvas-x-y-to-three-js-world-x-y-z
        
        let v: Vector3 = new Vector3(px, py, 0.5)
        let t: Vector3 = new Vector3()

        v.unproject(cam)
        v.sub(cam.position).normalize()
        let d = -cam.position.z / v.z
        //let d = ( unproject_z - cam.position.z ) / v.z
        t.copy(cam.position).add(v.multiplyScalar(d))

        return t
    } else if (cam.type === "OrthographicCamera") {
        let vz: number = (cam.near + cam.far) / (cam.near - cam.far)
        let v: Vector3 = new Vector3(px, py, vz)
        v.unproject(cam).sub(cam.position)

        return v
    }
  }
}