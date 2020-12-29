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
        "view",
        "zoom"
    ] as const
}
