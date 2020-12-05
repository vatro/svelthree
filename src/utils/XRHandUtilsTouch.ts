import XRHandTouchDefaults from "../defaults/XRHandTouchDefaults"
import { XRHandModel } from "svelthree-three"
import { XRHandTouchRayExt } from "./XRHandTouchRayExt"
import { XRHandTouchSphereExt } from "./XRHandTouchSphereExt"

export default class XRHandUtilsTouch {
    // Events

    public addListeners(hand: XRHandModel, listener: (event: Event) => void): void {
        hand.addEventListener("touchstart", listener)
        hand.addEventListener("touchend", listener)
    }

    public removeListeners(hand: XRHandModel, listener: (event: Event) => void): void {
        hand.removeEventListener("touchstart", listener)
        hand.removeEventListener("touchend", listener)
    }

    public applyEvents(
        leftHand: XRHandModel,
        rightHand: XRHandModel,
        touchEvents: XRHandTouchEvents,
        listener: (event: Event) => void
    ) {
        for (let i = 0; i < touchEvents.length; i++) {
            let item: XRHandTouchEventsItem = touchEvents[i]

            if (item.hand === XRHandTouchDefaults.ENABLED_LEFT) {
                leftHand.addEventListener(item.name + "start", listener)
                leftHand.addEventListener(item.name + "end", listener)
                this.registerEvent(leftHand, item)
            }

            if (item.hand === XRHandTouchDefaults.ENABLED_RIGHT) {
                rightHand.addEventListener(item.name + "start", listener)
                rightHand.addEventListener(item.name + "end", listener)
                this.registerEvent(rightHand, item)
            }

            if (item.hand === XRHandTouchDefaults.ENABLED_BOTH) {
                rightHand.addEventListener(item.name + "start", listener)
                rightHand.addEventListener(item.name + "end", listener)
                leftHand.addEventListener(item.name + "start", listener)
                leftHand.addEventListener(item.name + "end", listener)

                this.registerEvent(leftHand, item)
                this.registerEvent(rightHand, item)
            }
        }
    }

    private registerEvent(hand: XRHandModel, item: XRHandTouchEventsItem) {
        !hand.userData.touchEvent ? (hand.userData.touchEvent = {}) : null
        !hand.userData.touchEvent[item.name] ? (hand.userData.touchEvent[item.name] = {}) : null
        hand.userData.touchEvent[item.name].requiredTouchingJoints = item.index
    }

    public unregisterEvents(hand: XRHandModel) {
        hand.userData.touchEvent = undefined
    }

    // Updating

    public updateXRHandTouch(
        currentScene: Scene,
        raycaster: Raycaster,
        handProfile: XRHandProfile,
        leftHand: XRHandModel,
        rightHand: XRHandModel,
        xrHandTouch: XRHandTouchRayExt | XRHandTouchSphereExt,
        xrFrameDelta: number,
        useBVH: boolean,
        debug: XRHandTouchDebugParams
    ): void {
        //console.log("updateXRHandTouch!")

        // TODO  Impmlement better performance meassuring (decorators) + meassure again for both modes
        //console.time("updateXRHandTouch updates")
        // 0.01x ms - very low
        xrHandTouch.updateToTest(currentScene)
        xrHandTouch.updateBVH(useBVH)

        if (debug) {
            xrHandTouch.updateDebug(debug.enabled)

            if (debug.enabled && !xrHandTouch.debuggerInitiated) {
                xrHandTouch.setDebugger(debug)
            }
        }
        //console.timeEnd("updateXRHandTouch updates")

        //console.time("updateXRTouchRay update params")
        // 0.007 ms - almost nothing!
        let params: XRTouchUpdateParams = {
            handProfile: handProfile,
            raycaster: raycaster,
            xrFrameDelta: xrFrameDelta
        }
        //console.timeEnd("updateXRHandTouch update params")

        // TODO  Impmlement better performance meassuring (decorators) + meassure again for both modes and one/two hands
        //console.time("updateXRHandTouch hands update")
        // 0.09 - 0.4 (TOUCH AND TOUCH INSIDE) - 1.74 ms (FAST TOUCH CHECK)
        if (leftHand && leftHand.userData.touchEnabled === true) {
            //console.log("updateXRTouchRay left!")
            xrHandTouch.update(leftHand, params)
        }

        if (rightHand && rightHand.userData.touchEnabled === true) {
            //console.log("updateXRTouchRay right!")
            xrHandTouch.update(rightHand, params)
        }
        //console.timeEnd("updateXRTouchRay hands update")
    }
}
