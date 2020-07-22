<script lang="typescript" context="module">
    import { Object3D } from "svelthree-three"

    export class AnimationProp {
        fn: any

        constructor(fn: any) {
            this.fn = fn
        }

        initiate(obj: Object3D, ...args: any[]): any {
            let initiatedFn: any

            try {
                initiatedFn = this.fn(obj, args)

                if (!initiatedFn.hasOwnProperty("onStart")) {
                    console.warn(
                        "SVELTHREE > Provided animation is missing 'onStart' function!",
                        { animation: initiatedFn }
                    )
                    throw new Error("SVELTHREE Exception (see warning above)")
                }

                if (!initiatedFn.hasOwnProperty("onDestroy")) {
                    console.warn(
                        "SVELTHREE > Provided animation has no 'onDestroy' function!",
                        { animation: initiatedFn }
                    )
                    throw new Error("SVELTHREE Exception (see warning above)")
                }
            } catch (e) {
                throw new Error("SVELTHREE Exception (see warning above), " + e)
            }

            return initiatedFn
        }
    }
</script>
