/**
 * @author Vatroslav Vrbanic @see https://github.com/vatro
 */

import type { Object3D } from "three"
import PropUtils from "./PropUtils"
/*
 * Containes public static methods for updating Object3D properties via component shorthand attributes.
 */
export default class Object3DUtils {
	/**
	 * Updates *Object3D.position*  via `pos` component attribute (shorthand).
	 */
	public static tryPosUpdate(obj: Object3D, val: any) {
		PropUtils.setPositionFromValue(obj, val)
	}

	/**
	 * Updates *Object3D.rotation*  via `rot` component attribute (shorthand).
	 */
	public static tryRotUpdate(obj: Object3D, val: any): void {
		PropUtils.setRotationFromValue(obj, val)
	}

	/**
	 * Updates *Object3D.quat*  via `quat` component attribute (shorthand).
	 */
	public static tryQuternionUpdate(obj: Object3D, val: any): void {
		PropUtils.setRotationFromValue(obj, val)
	}

	/**
	 * Updates *Object3D.scale*  via `scale` component attribute (shorthand).
	 */
	public static tryScaleUpdate(obj: Object3D, val: any) {
		PropUtils.setScaleFromValue(obj, val)
	}

	/**
	 * Updates *Object3D.lookAt*  via `lookAt` component attribute (shorthand).
	 */
	public static tryLookAtUpdate(obj: Object3D, val: any) {
		//console.log("Object3DUtils tryLookAtUpdate!!!")
		PropUtils.setLookAtFromValue(obj, val)
	}

	/**
	 * Updates *Object3D.matrix*  via `matrix` component attribute (shorthand).
	 */
	public static tryMatrixUpdate(obj: Object3D, val: any) {
		PropUtils.setMatrixFromValue(obj, val)
	}

	/**
	 * Updates *Object3D.matrix*  via `quat` component attribute (shorthand).
	 */
	public static tryQuaternionUpdate(obj: Object3D, val: any) {
		PropUtils.setQuaternionFromValue(obj, val)
	}
}
