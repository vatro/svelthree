<script lang="typescript" context="module">
    /**
     * @author Vatroslav Vrbanic @see https://github.com/vatro
     */

    export function isValidArray3Prop(p: any): boolean {
        let isValid = false
        p && p.constructor === Array && p.length === 3 ? (isValid = true) : null
        return isValid
    }

    export function isArray(p: any): boolean {
        return p && p.constructor === Array
    }

    //TODO: implement
    export function isValidMatrix4(p: any): boolean {
        p
            ? console.error(
                  "SVELTHREE > passing a Matrix4 as prop is not implemented yet!"
              )
            : null
        return false
    }
</script>
