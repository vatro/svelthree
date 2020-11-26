import { Color } from "svelthree-three";

export class XRHandTouchFaceDebugger {

    touchCol = new Color(0x00ff00)
    unTouchCol = new Color(0x0000ff)
    touchThroughEnterCol = new Color(0xffff00)
    touchThroughExitCol = new Color(0xff00ff)
    scratchCol = new Color(0xc7c7c7)

    constructor() { }

    initialize(colors:{[key:string]: number}) {
        
        for (const [key, value] of Object.entries(colors)) {
            //console.log(`${key}: ${value}`);
            value !== undefined ? this[`${key}Col`] = new Color(value) : null
          }
    }

    colorTouchedFace(intersected: { [key: string]: any },  message: string) {
        this.colorFace(intersected, this.touchCol, message)
    }

    colorTouchThroughEnter(intersected: { [key: string]: any },  message: string) {
        this.colorFace(intersected, this.touchThroughEnterCol, message)
    }

    colorTouchThroughExit(intersected: { [key: string]: any },  message: string) {
        this.colorFace(intersected, this.touchThroughExitCol, message)
    }

    colorFastTouchEnter(intersected: { [key: string]: any },  message: string) {
        this.colorFace(intersected, this.touchThroughEnterCol, message)
    }

    colorScratch(intersected: { [key: string]: any },  message: string) {
        this.colorFace(intersected, this.scratchCol, message)
    }

    colorUnTouch(intersected: { [key: string]: any },  message: string) {
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