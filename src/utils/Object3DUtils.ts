/**
 * @author Vatroslav Vrbanic @see https://github.com/vatro
 */

import { Object3D, Vector3, Euler } from "svelthree-three"

export default class Object3DUtils {
    public static tryPosUpdate(obj: Object3D, p: Vector3 | [number, number, number] | number[]) {
        obj
            ? p.constructor === Vector3
                ? obj["position"].copy(p)
                : Array.isArray(p) && p.length === 3
                ? obj["position"].set(p[0], p[1], p[2])
                : console.error(
                      "SVELTHREE > Object3DUtils > prop " +
                          p.toString() +
                          " has to be an Array(3) or valid THREE.Vector3!",
                      { obj: obj, p: p }
                  )
            : null
    }

    public static tryRotUpdate(obj: Object3D, p: Euler | Parameters<Euler["set"]> | [number, number, number]) {
        obj
            ? p.constructor === Euler
                ? obj["rotation"].copy(p)
                : Array.isArray(p) && p.length === 3
                ? obj["rotation"].set(p[0], p[1], p[2])
                : Array.isArray(p) && p.length === 4
                ? obj["rotation"].set(p[0], p[1], p[2], p[3])
                : console.error(
                      "SVELTHREE > Object3DUtils > prop " +
                          p.toString() +
                          " has to be Array(3 || 4) or valid THREE.Euler!",
                      { obj: obj, p: p }
                  )
            : null
    }

    public static tryScaleUpdate(obj: Object3D, p: Vector3 | Parameters<Vector3["set"]>) {
        obj
            ? p.constructor === Vector3
                ? obj["scale"].copy(p)
                : Array.isArray(p)
                ? obj["scale"].set(p[0], p[1], p[2])
                : console.error(
                      "SVELTHREE > Object3DUtils > prop " +
                          p.toString() +
                          " has to be an Array(3) or valid THREE.Vector3!",
                      { obj: obj, p: p }
                  )
            : null
    }

    public static tryLookAtUpdate(obj: Object3D, p: Vector3 | Parameters<Vector3["set"]> | number[]) {
        obj.lookAt
            ? p.constructor === Vector3
                ? obj.lookAt(p)
                : Array.isArray(p) && p.length === 3
                ? obj.lookAt(p[0], p[1], p[2])
                : console.error(
                      "SVELTHREE > Object3DUtils > prop " +
                          p.toString() +
                          " has to be an Array(3) or valid THREE.Vector3!",
                      { obj: obj, p: p }
                  )
            : null
    }
}
