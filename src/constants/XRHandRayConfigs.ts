import { Vector3 } from "three"

declare type XRHandRayConfig = {
	origin: Vector3
	direction: Vector3
}

export default class XRHandRayConfigs {
	static dirRayLfwdProps: XRHandRayConfig = {
		origin: new Vector3(0, 0, 0),
		direction: new Vector3(1, 0.15, 0)
	}

	static dirRayRfwdProps: XRHandRayConfig = {
		origin: new Vector3(0, 0, 0),
		direction: XRHandRayConfigs.dirRayLfwdProps.direction.clone().negate()
	}

	static dirRayLdwnProps: XRHandRayConfig = {
		origin: new Vector3(0.025, 0, 0),
		direction: new Vector3(0.25, 1, 0)
	}

	static dirRayRdwnProps: XRHandRayConfig = {
		origin: XRHandRayConfigs.dirRayLdwnProps.origin.clone().negate(),
		direction: XRHandRayConfigs.dirRayLdwnProps.direction.clone().negate()
	}
}
