/**
 * @author Vatroslav Vrbanic @see https://github.com/vatro
 */

import { BufferGeometry, Color } from "three"
import { XRHandTouchDefaults } from "../constants"

interface Indexable {
	[key: string]: any
}

export default class XRHandTouchFaceDebugger {
	touchCol = new Color(XRHandTouchDefaults.DBG_FACE_TOUCH_COL)
	unTouchCol = new Color(XRHandTouchDefaults.DBG_FACE_UNTOUCH_COL)
	touchThroughEnterCol = new Color(XRHandTouchDefaults.DBG_FACE_TOUCHTHROUGH_ENTER_COL)
	touchThroughExitCol = new Color(XRHandTouchDefaults.DBG_FACE_TOUCHTHROUGH_EXIT_COL)
	scratchCol = new Color(XRHandTouchDefaults.DBG_FACE_SCRATCH_COL)

	constructor() {}

	initialize(colors: { [key: string]: number }) {
		if (colors) {
			for (const [key, value] of Object.entries(colors)) {
				value !== undefined ? ((this as Indexable)[`${key}Col`] = new Color(value)) : null
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
		message ? console.log("XRHandTouch : colorFace! " + message) : console.log("XRHandTouch : colorFace!")

		const geom: BufferGeometry = intersected.object.geometry as BufferGeometry
		const colorAttr = geom.getAttribute("color")

		if (colorAttr !== undefined) {
			colorAttr.setXYZ(intersected.face.a, color.r, color.g, color.b)
			colorAttr.setXYZ(intersected.face.b, color.r, color.g, color.b)
			colorAttr.setXYZ(intersected.face.c, color.r, color.g, color.b)
			colorAttr.needsUpdate = true
		}
	}
}
