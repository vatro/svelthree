import { Color } from "svelthree-three";

export class XRHandTouchFaceDebugger {

    hlColTouch: Color = new Color(0x00ff00)
    hlColTouch2: Color = new Color(0xffff00)
    hlColUnTouch2: Color = new Color(0xff00ff)
    hlColScratch: Color = new Color(0xc7c7c7)
    hlColUnTouch: Color = new Color(0x0000ff)

    constructor() { }

    colorTouchedFace(intersected: { [key: string]: any }) {
        this.colorFace(intersected, this.hlColTouch, null)
    }

    colorTouchThroughEnter(intersected: { [key: string]: any },  message: string) {
        this.colorFace(intersected, this.hlColTouch2, message)
    }

    colorTouchThroughExit(intersected: { [key: string]: any },  message: string) {
        this.colorFace(intersected, this.hlColUnTouch2, message)
    }

    colorFastTouchEnter(intersected: { [key: string]: any },  message: string) {
        this.colorFace(intersected, this.hlColTouch2, message)
    }

    colorScratch(intersected: { [key: string]: any },  message: string) {
        this.colorFace(intersected, this.hlColScratch, message)
    }

    colorUnTouch(intersected: { [key: string]: any },  message: string) {
        this.colorFace(intersected, this.hlColUnTouch, message)
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