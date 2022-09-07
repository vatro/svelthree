/** Camera props that need a **p**rojection **m**atrix **u**pdate after change. */
export const CAM_PROPS_PMU = new Set([
	"fov",
	"aspect",
	"near",
	"far",
	"filmOffset",
	"filmGauge",
	"focus",
	"zoom",
	"left",
	"right",
	"top",
	"bottom",
	"view"
])
