export default class ExposedPropKeys {
	public static ambientLight = ["color", "intensity"] as const

	public static perspectiveCamera = [
		"aspect",
		"far",
		"filmGauge",
		"filmOffset",
		"focus",
		"fov",
		"near",
		"zoom"
		//,"view"
	] as const

	public static orthographicCamera = [
		"left",
		"right",
		"top",
		"bottom",
		"near",
		"far",
		"zoom"
		//,"view"
	] as const

	public static mesh = [] as const
}
