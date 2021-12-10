/**
 * @author Vatroslav Vrbanic @see https://github.com/vatro
 */

import type { Group, Raycaster, Vector3 } from "three"
import type { RaycasterIntersectObject } from "../types-extra"
import { XRHandTouchDefaults } from "./constants"
import type { XrTouchUpdateParams } from "./types-svelthree"
import XRHandTouch from "./XRHandTouch"
import { verbose_mode } from "../utils/SvelthreeLogger"

export default class XRHandTouchRayExt extends XRHandTouch {
	constructor(
		lerpFactor: number = XRHandTouchDefaults.LERP_FACTOR,
		touchDistance: number = XRHandTouchDefaults.TOUCH_DISTANCE
	) {
		super()
		this.lerpFactor = lerpFactor
		this.touchDistance = touchDistance
	}

	// override
	checkUntouchOutside(
		handSpace: Group,
		joint: Group,
		i: number,
		intersectObj: RaycasterIntersectObject,
		logMessage: String,
		raycaster?: Raycaster,
		origin?: Vector3
	) {
		/*
		The joint is IN 'touchDistance' with the currently intersected object / face which at this point
		can be either the same (initially touched) or a different face of the SAME OBJECT:
		The first two conditions in the 'XRHandTouch.touchingOutsideCheck' method check only for
		different face and expect the currently intersected object to be the same as the initially
		touched / intersected one (see 'joint.userData.touchObj')
		 TODO  can we just us this method for DIFFERENT object?! We're updating ('joint.userData.touchObj = intersectObj.object), so it should be possible
		 TODO  CHECK THE ABOVE TODO!
		*/
		if (intersectObj.distance < this.touchDistance) {
			/*
			Don't dispatch 'untouch'!
			We update the 'joint.userData', but NOT yet 'joint.userData.raycasterTouchingDir',
			we leave 'raycasterTouchingDir' as it is / was in the moment of the 'touch' event
			before trying to switch to preferred "NEGATIVE NORMAL direction ray" raycast in order
			for it to be used for subsequent raycasts --> real distance on next raycast.
			*/
			joint.userData.touchObj = intersectObj.object
			joint.userData.touchFaceNormal = intersectObj.face.normal
			joint.userData.touchFaceIndex = intersectObj.faceIndex

			/*
			Check if can switch to "NEGATIVE NORMAL direction ray" otherwise keep the old direction!
			*/

			// re-raycast using "NEGATIVE NORMAL direction ray"! (in order to be used for subsequent raycasts --> real distance on next raycast)
			let nnRayHitDirection: Vector3 = this.nnRayIntersectsFace(joint, raycaster, origin, intersectObj)
			if (nnRayHitDirection) {
				// "NEGATIVE NORMAL direction ray" intersects the face means we can safely update 'raycasterTouchingDir' to 'nnRayHitDirection'
				joint.userData.raycasterTouchingDir = nnRayHitDirection
			}
			if (this.debug && this.faceDebugger) {
				this.faceDebugger.colorTouchedFace(intersectObj, null)
			}
		} else {
			// the joint SEEMS to be OUT OF 'touchDistance' (using the initial directional ray), but before dispatching untouch check if maybe the negative normal ray ist inside touch range
			let nnRayIsInsideTouchDir: Vector3 = this.nnRayIntersectsFaceAndIsInTouchRange(
				joint,
				raycaster,
				origin,
				intersectObj
			)
			if (nnRayIsInsideTouchDir) {
				// the joint is IN 'touchDistance' to the currently intersected object / face after "NEGATIVE NORMAL direction ray" raycast check --> update joint.userData!
				joint.userData.touchObj = intersectObj.object
				joint.userData.touchFaceNormal = intersectObj.face.normal
				joint.userData.touchFaceIndex = intersectObj.faceIndex

				// ... we can also safely update raycasterTouchingDir
				joint.userData.raycasterTouchingDir = nnRayIsInsideTouchDir
				if (this.debug && this.faceDebugger) {
					this.faceDebugger.colorTouchedFace(intersectObj, null)
				}
			} else {
				// the joint is OUT OF 'touchDistance' to the currently intersected object / face after "NEGATIVE NORMAL direction ray" raycast check --> dispatch 'untouch'!
				if (verbose_mode()) console.debug(logMessage, intersectObj.distance)
				if (this.debug) {
					if (this.faceDebugger) {
						this.faceDebugger.colorUnTouch(intersectObj, null)
					}
					if (this.debuggerRay && this.debuggerRay.drawTentacles) {
						this.debuggerRay.removeAllTentacles(joint)
					}
				}

				// dispatch 'untouch'
				this.resetJointTouchData(joint)
				this.removeJointFromTouchingArray(handSpace, i)
				this.dispatchUntouch(XRHandTouchDefaults.TOUCH_TEST_MODE_RAY, handSpace, joint, i, intersectObj)
			}
		}
	}

	// override
	nnRayIntersectsFaceAndIsInTouchRangeCheck(testRaycast: any[], intersectObj: { [key: string]: any }): boolean {
		return (
			testRaycast.length > 0 &&
			testRaycast[0].object === intersectObj.object &&
			testRaycast[0].faceIndex === intersectObj.faceIndex &&
			this.isInTouchDistance(testRaycast)
		)
	}

	// override
	intersectionsPhase1Raycast(params: XrTouchUpdateParams, joint: Group): any {
		return this.doRaycast(
			params.raycaster,
			joint.userData.origin,
			joint.userData.direction,
			0,
			this.touchDistance * joint.userData.speedFac
		)
	}

	// override
	isInTouchDistance(intersections: any[], joint?: Group): boolean {
		return intersections[0].distance <= this.touchDistance
	}
}
