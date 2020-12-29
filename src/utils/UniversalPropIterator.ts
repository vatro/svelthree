/**
 * @author Vatroslav Vrbanic @see https://github.com/vatro
 */

import { Color, Vector3, Object3D } from "svelthree-three"
import PropUtils from "./PropUtils"

export default class UniversalPropIterator {
    obj: any
    objTypeStr: string
    dlTarget: Object3D
    props: object

    // TODO  implement proper handling of type Material[]
    constructor(obj: any) {
        this.obj = obj
        this.objTypeStr = obj["type"]

        if (!this.objTypeStr) {
            switch (this.obj.constructor.name) {
                /**
                 * TODO  Updating WebGLCubeRenderTarget is not working as initally expected,
                 * but we'll keep this code here (does no harm), in case we missed something
                 * @see CubeCamera.svelte
                 */
                case "WebGLCubeRenderTarget":
                    this.objTypeStr = "WebGLCubeRenderTarget"
                    break
                default:
                    this.objTypeStr = ""
                    console.info(
                        "SVELTHREE  TODO  > UniversalPropIterator > constructor : obj has no 'type' property, probably of type 'Material[]' or WebGLRenderer",
                        obj
                    )
                    break
            }
        }

        this.dlTarget = undefined
    }

    trySetFromVector3OrArray(p: string): void {
        this.props[p].constructor === Vector3
            ? this.obj[p].copy(this.props[p])
            : Array.isArray(this.props[p])
            ? this.obj[p].set(this.props[p][0], this.props[p][1], this.props[p][2])
            : null
    }

    trySetColor(p: string): void {
        if (PropUtils.isArray(this.props[p])) {
            if (PropUtils.isValidArray3Prop(this.props[p])) {
                this.obj[p] = new Color(this.props[p][0], this.props[p][1], this.props[p][2])
            } else {
                console.error(
                    "SVELTHREE > UniversalPropIterator > trySetColor : Prop should be an Array of three (3) values!",
                    p
                )
            }
        } else if (!isNaN(this.props[p])) {
            this.obj[p] = new Color(this.props[p])
        } else if (this.props[p] instanceof Color) {
            this.obj[p] = this.props[p]
        }
    }

    trySetRotation(p: string): void {
        PropUtils.isValidEuler(this.props[p]) ? this.obj[p].copy(this.props[p]) : this.trySetFromVector3OrArray(p)
    }

    /**  TODO : I came up with the concept of Empty being basically a bare Object3D but it needs to be typed properly (own class?), right now, we're relying on it being passed
     * as 'target' inside DirectionalLightProps, that's not good practice.
     */
    checkSetDlTarget(p: string): void {
        this.props[p] === undefined
            ? // TODO : Check why this is undefined on init! Not severe problem, but still to be checked.
              null //console.warn("SVELTHREE > UniversalPropIterator > checkSetDlTarget : " + this.objTypeStr + " : target in 'props' but undefined!")
            : // TODO : Check why this being called twice on init! Not severe problem, but still to be checked.
              //console.warn("SVELTHREE > UniversalPropIterator > checkSetDlTarget : " + this.objTypeStr + " : target in 'props' now defined!!"),
              (this.obj[p] = this.props[p].getEmpty())
    }

    tryPropsUpdate(props: object): void {
        this.props = props
        //console.info("SVELTHREE > UniversalPropIterator > tryPropsUpdate : this.props: ", this.props)

        if (this.obj) {
            /*
                console.info(
                    "SVELTHREE > UniversalPropIterator > tryPropsUpdate : " +
                        this.objTypeStr +
                        " : this.props: ",
                    this.props
                )
                */

            for (let p in this.props) {
                //console.info("SVELTHREE > " + this.objTypeStr + " : tryPropsUpdate, p: ", p)
                //console.info("SVELTHREE > " + this.objTypeStr + " : tryPropsUpdate, this.props[p]: ", this.props[p])

                if (this.obj.hasOwnProperty(p)) {
                    /*
                        console.info(
                            "SVELTHREE > " +
                                this.objTypeStr +
                                " : properties provided via 'props' will override other shorthand props!, p:",
                            p
                        )
                        */

                    // TODO  Does Three check if props are equal and not change / set them if? Are there any serious drawbacks at all (performance) if no equality check?

                    if (p === "scale" || p === "position") {
                        this.trySetFromVector3OrArray(p)
                    } else if (p === "rotation") {
                        this.trySetRotation(p)
                    } else if (p === "color" || p === "groundColor") {
                        this.trySetColor(p)
                    } else if (
                        p === "target" &&
                        (this.objTypeStr === "DirectionalLight" || this.objTypeStr === "SpotLight")
                    ) {
                        this.checkSetDlTarget(p)
                    } else {
                        try {
                            this.obj[p] = this.props[p]
                        } catch (e) {
                            console.error(
                                "SVELTHREE > UniversalPropIterator > tryPropsUpdate : couldn't update prop!",
                                { obj: this.obj, prop: p }
                            )
                        }
                    }
                } else if (this.obj[p.toString()]) {
                    //method
                    if (p === "lookAt") {
                        if (this.obj["lookAt"]) {
                            if (this.props[p].constructor === Vector3) {
                                this.obj["lookAt"](this.props[p])
                            } else if (PropUtils.isArray(this.props[p])) {
                                this.obj["lookAt"](this.props[p][0], this.props[p][1], this.props[p][2])
                            } else {
                                console.error(
                                    "SVELTHREE > UniversalPropIterator > tryPropsUpdate : couldn't update 'lookAt'!",
                                    { obj: this.obj, prop: p }
                                )
                            }
                        }
                    } else {
                        /**
                         * TODO  Updating WebGLCubeRenderTarget is not working as initally expected,
                         * but we'll keep this code here (does no harm), in case we missed something
                         * @see CubeCamera.svelte
                         */
                        if (this.obj.constructor.name === "WebGLCubeRenderTarget") {
                            /*
                            console.info(
                                "SVELTHREE > " +
                                    this.objTypeStr +
                                    " : properties provided via 'props' will override other shorthand props!, p:",
                                p
                            )
                            */
                            this.obj["texture"][p] = this.props[p]
                        } else {
                            console.error(
                                "SVELTHREE > UniversalPropIterator > " +
                                    this.objTypeStr +
                                    " : No such property in " +
                                    this.objTypeStr +
                                    "! : " +
                                    p.toString()
                            )
                        }
                    }
                }
            }

            if (this.objTypeStr.includes("Material")) {
                let obj = this.obj as THREE.Material
                obj.needsUpdate = true
            }

            if (this.objTypeStr.includes("Camera")) {
                let obj = this.obj as THREE.PerspectiveCamera | THREE.OrthographicCamera
                obj.updateProjectionMatrix()
            }
        }
    }
}
