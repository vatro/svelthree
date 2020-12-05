import { XRHandModel } from "svelthree-three"

export default class XRHandUtilsPinch {
    // event: Event --> Custom three.js Event defined inside WebXRController.js
    public addListeners(hand: XRHandModel, listener: (event: Event) => void): void {
        hand.addEventListener("pinchstart", listener)
        hand.addEventListener("pinchend", listener)
    }

    // event: Event --> Custom three.js Event defined inside WebXRController.js
    public removeListeners(hand: XRHandModel, listener: (event: Event) => void): void {
        hand.removeEventListener("pinchstart", listener)
        hand.removeEventListener("pinchend", listener)
    }
}
