<script lang="typescript" context="module">
    /**
     * @author Vatroslav Vrbanic @see https://github.com/vatro
     */

    import { Object3D, Vector3, Euler } from "svelthree-three"
    import type {
        PropPos,
        PropRot,
        PropScale,
        PropLookAt
    } from "./Sv3Types.svelte"

    //hehe?

    export class Object3DUtils {
        obj: Object3D

        constructor(obj: Object3D) {
            this.obj = obj
        }

        tryPosUpdate(p: PropPos) {
            this.obj
                ? p.constructor === Vector3
                    ? this.obj["position"].copy(p)
                    : Array.isArray(p) && p.length === 3
                    ? this.obj["position"].set(p[0], p[1], p[2])
                    : console.error(
                          "SVELTHREE > Object3DUtils > prop " +
                              p.toString() +
                              " has to be an Array(3) or valid THREE.Vector3!",
                          { obj: this.obj, p: p }
                      )
                : null
        }

        tryRotUpdate(p: PropRot) {
            this.obj
                ? p.constructor === Euler
                    ? this.obj["rotation"].copy(p)
                    : Array.isArray(p) && p.length === 3
                    ? this.obj["rotation"].set(p[0], p[1], p[2])
                    : Array.isArray(p) && p.length === 4
                    ? this.obj["rotation"].set(p[0], p[1], p[2], p[3])
                    : console.error(
                          "SVELTHREE > Object3DUtils > prop " +
                              p.toString() +
                              " has to be Array(3 || 4) or valid THREE.Euler!",
                          { obj: this.obj, p: p }
                      )
                : null
        }

        tryScaleUpdate(p: PropScale) {
            this.obj
                ? p.constructor === Vector3
                    ? this.obj["scale"].copy(p)
                    : Array.isArray(p)
                    ? this.obj["scale"].set(p[0], p[1], p[2])
                    : console.error(
                          "SVELTHREE > Object3DUtils > prop " +
                              p.toString() +
                              " has to be an Array(3) or valid THREE.Vector3!",
                          { obj: this.obj, p: p }
                      )
                : null
        }

        tryLookAtUpdate(p: PropLookAt) {
            this.obj.lookAt
                ? p.constructor === Vector3
                    ? this.obj.lookAt(p)
                    : Array.isArray(p) && p.length === 3
                    ? this.obj.lookAt(p[0], p[1], p[2])
                    : console.error(
                          "SVELTHREE > Object3DUtils > prop " +
                              p.toString() +
                              " has to be an Array(3) or valid THREE.Vector3!",
                          { obj: this.obj, p: p }
                      )
                : null
        }
    }
</script>
