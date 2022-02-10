/**
 * @author Vatroslav Vrbanic @see https://github.com/vatro
 */

import type { WebGLCubeRenderTarget } from "three"
import PropUtils from "./PropUtils"
import { has_prop } from "svelte/internal"
import type { ComplexValueType } from "../types-extra"

export default class Propeller {
	public static getObjectType(obj: any): string {
		return obj["type"] || obj.constructor.name
	}

	public static update(obj: any, key: string, value: any, complex?: ComplexValueType): void {
		const objType: string = Propeller.getObjectType(obj)
		const hasProp: any = has_prop(obj, key)
		const hasKey: boolean = hasProp ? false : obj[key] ? true : false

		// handle own properties (as opposed to inherited ones)
		if (hasProp) {
			switch (key) {
				case "position":
					PropUtils.setPositionFromValue(obj, value, complex)
					break
				case "rotation":
					PropUtils.setRotationFromValue(obj, value, complex)
					break
				case "scale":
					PropUtils.setScaleFromValue(obj, value, complex)
					break
				case "color":
					PropUtils.setColorFromValueKey(obj, value, key, complex)
					break
				case "target":
					if (objType === "DirectionalLight" || objType === "SpotLight") {
						PropUtils.setLightTarget(obj, value)
					}
					break
				case "quaternion":
					PropUtils.setQuaternionFromValue(obj, value, complex)
					break
				case "matrix":
					PropUtils.setMatrixFromValue(obj, value)
					break

				case "groundColor":
					PropUtils.setColorFromValueKey(obj, value, key, complex)
					break
				case "background":
					PropUtils.setColorFromValueKey(obj, value, key, complex)
					break

				default:
					PropUtils.applyValueToProp(obj, value, key)
					break
			}
			// check inherited properties
		} else if (hasKey) {
			switch (key) {
				case "lookAt":
					PropUtils.setLookAtFromValue(obj, value, complex)
					break
				default:
					if (objType === "WebGLCubeRenderTarget") {
						/*
										if (verbose_mode()) { console.debug(
											"SVELTHREE > " +
												this.objTypeStr +
												" : properties provided via 'props' will override other shorthand props!, p:",
											p
										)}
										*/
						let cubeRenderTarget = obj as WebGLCubeRenderTarget
						cubeRenderTarget.texture[key] = value
					} else {
						// PropUtils.applyValueToProp(obj, value, key)
						console.error(`SVELTHREE > Propeller > ${objType} : updating '${key}' is not implemented!`, {
							key: key,
							value: value
						})
					}
					break
			}
		} else {
			console.error(`SVELTHREE > Propeller > ${objType} : No such property in ${objType}! : ${key}`, {
				key: key,
				value: value
			})
		}

		if (hasProp || hasKey) {
			if (objType.includes("Material")) {
				let mat = obj as THREE.Material
				mat.needsUpdate = true
			}

			if (objType.includes("Camera")) {
				// TODO  'view' property
				// updates the camera projection matrix. Must be called after any change of parameters.
				if (
					key === "fov" ||
					"aspect" ||
					"near" ||
					"far" ||
					"filmOffset" ||
					"filmGauge" ||
					"focus" ||
					"zoom" ||
					"left" ||
					"right" ||
					"top" ||
					"bottom"
				) {
					let cam = obj as THREE.PerspectiveCamera | THREE.OrthographicCamera
					cam.updateProjectionMatrix()
				}
			}
		}
	}
}
