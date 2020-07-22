<script lang="typescript" context="module">
    /**
     * @author Vatroslav Vrbanic @see https://github.com/vatro
     */

    import { Color, Light } from "svelthree-three"
    import { isValidArray3Prop, isArray } from "./PropUtils.svelte"

    export class LightUtils {
        light: Light

        constructor(light: Light) {
            this.light = light
        }

        tryIntensityUpdate(intensity: number) {
            console.info(
                "SVELTHREE > LightUtils > tryIntensityUpdate ",
                intensity
            )
            this.light ? (this.light.intensity = intensity) : null
        }

        // TOFIX  different / better!
        tryColorUpdate(color: any) {
            console.info("color", color)
            this.light
                ? isArray(color)
                    ? isValidArray3Prop(color)
                        ? (this.light.color = new Color(
                              color[0],
                              color[1],
                              color[2]
                          ))
                        : null
                    : (this.light.color = new Color(color))
                : null
        }

        tryShadowMapSizeUpdate(shadowMapSize: number) {
            console.info(
                "SVELTHREE > LightUtils > tryShadowMapSizeUpdate",
                shadowMapSize
            )
            this.light
                ? ((this.light.shadow.mapSize.width = shadowMapSize),
                  (this.light.shadow.mapSize.height = shadowMapSize))
                : null
        }

        /**
         * This is to be used with caution as it my break shadows! We tried to adjust the Toon-Shader with,
         * but with no satifying result
         * @param shadowBiasSize
         */
        tryShadowBiasUpdate(shadowBiasSize: number) {
            console.info(
                "SVELTHREE > LightUtils > tryShadowBiasUpdate",
                shadowBiasSize
            )
            this.light
                ? ((this.light.shadow.bias = shadowBiasSize),
                  (this.light.shadow.bias = shadowBiasSize))
                : null
        }

        tryCastShadowUpdate(castShadow: boolean) {
            console.info(
                "SVELTHREE > LightUtils > tryCastShadowUpdate",
                castShadow
            )
            this.light ? (this.light.castShadow = castShadow) : null
            //console.info("SVELTHREE > LightUtils > tryCastShadowUpdate", {light: this.light, castShadow: castShadow})
        }
    }
</script>
