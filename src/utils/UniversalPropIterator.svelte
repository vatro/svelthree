<script lang="typescript" context="module">
    /**
     * @author Vatroslav Vrbanic @see https://github.com/vatro
     */

    import {
        Color,
        Vector3,
        Object3D,
        Material,
        WebGLRenderer,
        OrbitControls
    } from "svelthree-three"
    import { isValidArray3Prop, isArray } from "./PropUtils.svelte"

    export class UniversalPropIterator {
        obj: Object3D | Material | Material[] | WebGLRenderer | OrbitControls
        objTypeStr: string
        dlTarget: Object3D
        props: object

        //TODO: implement proper handling of type Material[]
        constructor(obj: Object3D | Material | Material[] | WebGLRenderer) {
            this.obj = obj
            obj["type"]
                ? (this.objTypeStr = obj["type"])
                : ((this.objTypeStr = ""),
                  console.info(
                      "SVELTHREE TODO > UniversalPropIterator > constructor : obj has no 'type' property, probably of type 'Material[]' or WebGLRenderer",
                      obj
                  ))
            this.dlTarget = undefined
        }

        setFromVector3OrArray(p: string): void {
            this.props[p].constructor === Vector3
                ? this.obj[p].copy(this.props[p])
                : Array.isArray(this.props[p])
                ? this.obj[p].set(
                      this.props[p][0],
                      this.props[p][1],
                      this.props[p][2]
                  )
                : null
        }

        checkSetColor(p: string): void {
            if (isArray(this.props[p])) {
                if (isValidArray3Prop(this.props[p])) {
                    this.obj[p] = new Color(
                        this.props[p][0],
                        this.props[p][1],
                        this.props[p][2]
                    )
                } else {
                    console.error(
                        "SVELTHREE > UniversalPropIterator > checkSetColor : Prop should be an Array of three (3) values!",
                        p
                    )
                }
            } else {
                this.obj[p] = new Color(this.props[p])
            }
        }

        /**  TODO : I came up with the concept of Empty being basically a bare Object3D but it needs to be typed properly (own class?), right now, we're relying on it being passed
         * as 'target' inside DirectionalLightProps, that's not good practice.
         */
        checkSetDlTarget(p: string): void {
            this.props[p] === undefined
                // TODO : Check why this is undefined on init! Not severe problem, but still to be checked.
                ? null //console.warn("SVELTHREE > UniversalPropIterator > checkSetDlTarget : " + this.objTypeStr + " : target in 'props' but undefined!")
                : ( // TODO : Check why this being called twice on init! Not severe problem, but still to be checked.
                    //console.warn("SVELTHREE > UniversalPropIterator > checkSetDlTarget : " + this.objTypeStr + " : target in 'props' now defined!!"),
                    this.obj[p] = this.props[p].getEmpty())
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
                        //console.info("SVELTHREE > " + this.objTypeStr + " : properties provided via 'props' will override other shorthand props!")

                        //TODO: Does Three check if props are equal and not change / set them if? Are there any serious drawbacks at all (performance) if no equality check?
                        p === "scale" || p === "position" || p === "rotation"
                            ? this.setFromVector3OrArray(p)
                            : p === "color"
                            ? this.checkSetColor(p)
                            : p === "target" &&
                              this.objTypeStr === "DirectionalLight"
                            ? this.checkSetDlTarget(p)
                            : //standard 1:1
                              (this.obj[p] = this.props[p])
                    } else if (this.obj[p.toString()]) {
                        //method
                        p === "lookAt" && this.obj["lookAt"]
                            ? this.props[p].constructor === Vector3
                                ? this.obj["lookAt"](this.props[p])
                                : Array.isArray(this.props[p])
                                ? this.obj["lookAt"](
                                      this.props[p][0],
                                      this.props[p][1],
                                      this.props[p][2]
                                  )
                                : null
                            : null
                    } else {
                        console.error(
                            "SVELTHREE > " +
                                this.objTypeStr +
                                " : No such property in " +
                                this.objTypeStr +
                                "! : " +
                                p.toString()
                        )
                    }
                }
            }

            if (this.objTypeStr.includes("Material")) {
                this.obj["needsUpdate"] = true
            }
        }
    }
</script>
