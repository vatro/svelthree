/**
 * @author Vatroslav Vrbanic @see https://github.com/vatro
 */

import type { Group } from "svelthree-three"

export default class XRHandUtilsPinch {
	// event: Event --> Custom three.js Event defined inside WebXRController.js
	public addListeners(handSpace: Group, listener: (event: THREE.Event) => void): void {
		handSpace.addEventListener("pinchstart", listener)
		handSpace.addEventListener("pinchend", listener)
	}

	// event: Event --> Custom three.js Event defined inside WebXRController.js
	public removeListeners(handSpace: Group, listener: (event: THREE.Event) => void): void {
		handSpace.removeEventListener("pinchstart", listener)
		handSpace.removeEventListener("pinchend", listener)
	}
}
