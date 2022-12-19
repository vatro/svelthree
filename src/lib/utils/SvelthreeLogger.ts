import LogCSS from "../constants/LogCSS.js"
import type { AnySvelthreeComponent } from "svelthree/types/types-extra.js"
import type { get_current_component } from "svelte/internal"

export type LogLC = { all?: boolean; om?: boolean; bu?: boolean; au?: boolean; od?: boolean }

// Currently configuring logging of the 'PropUtils' class only.
export type LogDEV = { all?: boolean; prop_utils?: boolean }

function verbose_mode(): boolean {
	if (import.meta.env.VITE_SVELTHREE_VERBOSE == "1") {
		return true
	} else if (!import.meta.env.VITE_SVELTHREE_VERBOSE || import.meta.env.VITE_SVELTHREE_VERBOSE == "0") {
		return false
	} else {
		throw new Error(
			`SVELTHREE > SvelthreeLogger > verboseMode : 'SVELTHREE_VERBOSE' (environment variable) has an invalid value: '${
				import.meta.env.VITE_SVELTHREE_VERBOSE
			}', allowed values are '1' or '0'! Please check your environment configuration / .env files.`
		)
	}
}

function log_prop_utils(obj: ReturnType<AnySvelthreeComponent["get_instance"]>): boolean {
	if (obj) {
		if (obj.userData) {
			if (obj.userData.svelthreeComponent) {
				if (obj.userData.svelthreeComponent.log_dev) {
					return (
						obj.userData.svelthreeComponent.log_dev.all ||
						obj.userData.svelthreeComponent.log_dev.prop_utils
					)
				} else {
					return false
				}
			} else {
				if (obj.type.includes("Camera") && obj.parent === null && !obj.userData.svelthreeComponent) {
					//console.warn("[ REMARK ] SvelthreeLogger > PropUtils is (most propbably) about to change change props of an internal Shadow-Camera (OrthographicCamera)...", obj)
					if (obj.userData.log_dev) {
						return obj.userData.log_dev.all || obj.userData.log_dev.prop_utils
					} else {
						return false
					}
				} else if (obj.type.includes("Material")) {
					console.warn(
						"[ TODO ] SvelthreeLogger > Logging of Materials must be set manually by e.g. adding 'log_dev: { prop_utils: false }' to 'userData' ...",
						obj
					)
					return true
				}
			}
		} else {
			// DirectionalLightShadow has OrthographicCamera as camera
			// PointLightShadow has PerspectiveCamera as camera
			// SpotLightShadow has PerspectiveCamera as camera
			if (obj.isDirectionalLightShadow || obj.isPointLightShadow || obj.isSpotLightShadow) {
				if (obj.camera) {
					if (obj.camera.userData.log_dev) {
						return obj.camera.userData.log_dev.all || obj.camera.userData.log_dev.prop_utils
					} else {
						return false
					}
				} else {
					// this shouldn't happen!
					throw new Error("SVELTHREE > SvelthreeLogger > no 'camera' in 'obj'!")
				}
			} else {
				// TODO  Wait for it and see what's going on ...
				console.warn("[ TODO ] SvelthreeLogger > no 'userData' in 'obj'! Logging allowed ...")
				return true
			}
		}
	} else {
		// this shouldn't happen!
		throw new Error("SVELTHREE > SvelthreeLogger > no 'obj'!")
	}

	return false
}

function c_lc(comp_name: string, message: string, value?: unknown): [string, string, string, unknown] {
	let css = undefined
	let prefix = undefined

	switch (message) {
		case "onMount":
			css = LogCSS.ON_MOUNT
			prefix = LogCSS.PREFIX_ON_MOUNT
			break
		case "beforeUpdate":
			css = LogCSS.BEFORE_UPDATE
			prefix = LogCSS.PREFIX_BEFORE_UPDATE
			break
		case "afterUpdate":
			css = LogCSS.AFTER_UPDATE
			prefix = LogCSS.PREFIX_AFTER_UPDATE
			break
	}

	let depth_prefix = ""

	switch (comp_name) {
		case "Canvas":
			depth_prefix = ""
			break
		case "Scene":
			depth_prefix = "·"
			break
		default:
			depth_prefix = "··"
			break
	}

	if (depth_prefix !== "") {
		return [
			`%c${depth_prefix} ${prefix} ${comp_name}%c · ${message}`,
			`${css}`,
			`font-wight: normal; font-style: italic; color: silver;`,
			value ? value : value === true || value === false ? value : ""
		]
	} else {
		return [
			`%c${prefix} ${comp_name}%c · ${message}`,
			`${css}`,
			`font-wight: normal; font-style: italic; color: silver;`,
			value ? value : value === true || value === false ? value : ""
		]
	}
}

function c_rs(comp_name: string, message: string, value?: unknown): [string, string, unknown] {
	return [
		`%c$: > ${comp_name} -> ${message}`,
		`${LogCSS.REACTIVE_STATEMENT}`,
		value ? value : value === true || value === false ? value : ""
	]
}

function c_lc_int(comp_name: string, message: string, value?: unknown): [string, string, string, unknown] {
	let css = undefined
	let prefix = undefined

	switch (message) {
		case "onMount":
			css = LogCSS.ON_MOUNT
			prefix = LogCSS.PREFIX_ON_MOUNT
			break
		case "beforeUpdate":
			css = LogCSS.BEFORE_UPDATE
			prefix = LogCSS.PREFIX_BEFORE_UPDATE
			break
		case "afterUpdate":
			css = LogCSS.AFTER_UPDATE
			prefix = LogCSS.PREFIX_AFTER_UPDATE
			break
	}

	let depth_prefix = ""

	switch (comp_name) {
		case "Camera":
		case "Light":
			depth_prefix = "···"
			break

		default:
			depth_prefix = "··"
			break
	}

	if (depth_prefix !== "") {
		return [
			`%c${depth_prefix} ${prefix} ${comp_name}%c · (internal component) ${message}`,
			`${css}`,
			`font-wight: normal; font-style: italic; color: silver;`,
			value ? value : value === true || value === false ? value : ""
		]
	} else {
		return [
			`%c${prefix} ${comp_name}%c · (internal component) ${message}`,
			`${css}`,
			`font-wight: normal; font-style: italic; color: silver;`,
			value ? value : value === true || value === false ? value : ""
		]
	}
}

function c_rs_int(comp_name: string, message: string, value?: unknown): [string, string, unknown] {
	return [
		`%c$: > ${comp_name} -> ${message}`,
		`${LogCSS.REACTIVE_STATEMENT}`,
		value ? value : value === true || value === false ? value : ""
	]
}

function c_dev(comp_name: string, message: string, value?: unknown): [string, string, unknown] {
	return [
		`%c[ dev ] -> ${comp_name} : ${message}`,
		`${LogCSS.DEV_DEBUG}`,
		value ? value : value === true || value === false ? value : ""
	]
}

function c_mau(comp_name: string, message: string, value?: unknown): [string, string, unknown] {
	return [
		`%c[ mau ] -> ${comp_name} : ${message}`,
		`${LogCSS.FEATURE_MAU}`,
		value ? value : value === true || value === false ? value : ""
	]
}

function get_comp_name(comp: ReturnType<typeof get_current_component>): string {
	return comp.constructor.name.replace(/[\d_]/g, "")
}

export { c_rs, c_dev, c_lc, c_lc_int, c_rs_int, c_mau, verbose_mode, get_comp_name, log_prop_utils }
