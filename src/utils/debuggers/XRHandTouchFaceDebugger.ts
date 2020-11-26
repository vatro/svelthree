import { Color } from "svelthree-three"
import XRHandTouchDefaults from "../XRHandTouchDefaults"

export class XRHandTouchFaceDebugger {

    touchCol = new Color(XRHandTouchDefaults.DBG_FACE_TOUCH_COL)
    unTouchCol = new Color(XRHandTouchDefaults.DBG_FACE_UNTOUCH_COL)
    touchThroughEnterCol = new Color(XRHandTouchDefaults.DBG_FACE_TOUCHTHROUGH_ENTER_COL)
    touchThroughExitCol = new Color(XRHandTouchDefaults.DBG_FACE_TOUCHTHROUGH_EXIT_COL)
    scratchCol = new Color(XRHandTouchDefaults.DBG_FACE_SCRATCH_COL)

    constructor() { }

    initialize(colors: { [key: string]: number }) {

        if (colors) {
            for (const [key, value] of Object.entries(colors)) {
                value !== undefined ? this[`${key}Col`] = new Color(value) : null
            }
        }
    }

    colorTouchedFace(intersected: { [key: string]: any }, message: string) {
        this.colorFace(intersected, this.touchCol, message)
    }

    colorTouchThroughEnter(intersected: { [key: string]: any }, message: string) {
        this.colorFace(intersected, this.touchThroughEnterCol, message)
    }

    colorTouchThroughExit(intersected: { [key: string]: any }, message: string) {
        this.colorFace(intersected, this.touchThroughExitCol, message)
    }

    colorFastTouchEnter(intersected: { [key: string]: any }, message: string) {
        this.colorFace(intersected, this.touchThroughEnterCol, message)
    }

    colorScratch(intersected: { [key: string]: any }, message: string) {
        this.colorFace(intersected, this.scratchCol, message)
    }

    colorUnTouch(intersected: { [key: string]: any }, message: string) {
        this.colorFace(intersected, this.unTouchCol, message)
    }

    colorFace(intersected: { [key: string]: any }, color: Color, message: string) {
        console.log("XRHandTouch : colorFace! " + message)
        try {
            intersected.object.geometry.attributes.color.setXYZ(intersected.face.a, color.r, color.g, color.b)
            intersected.object.geometry.attributes.color.setXYZ(intersected.face.b, color.r, color.g, color.b)
            intersected.object.geometry.attributes.color.setXYZ(intersected.face.c, color.r, color.g, color.b)
            intersected.object.geometry.attributes.color.needsUpdate = true;
        } catch {
            debugger
        }
    }
}