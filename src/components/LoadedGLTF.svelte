<script lang="typescript">
    /**
     * @author Vatroslav Vrbanic @see https://github.com/vatro
     */

    import {
        GLTFLoader,
        DRACOLoader,
        LoadingManager,
        Group
    } from "svelthree-three"
    import type { GLTF } from "svelthree-three"
    import { createEventDispatcher } from "svelte"

    const dispatch: (
        type: string,
        detail?: any
    ) => void = createEventDispatcher()

    /**
     * @see https://threejs.org/docs/#manual/en/introduction/Loading-3D-models
     */
    // construction

    export let path: string = undefined
    export let async: boolean = undefined

    // optional props
    export let draco: boolean = undefined
    export let dracoPath: string = undefined

    if (!dracoPath && draco) {
        console.warn(
            "SVELTHREE > LoadedGLTF : You need to provide a 'dracoPath' prop if you use Draco!",
            { path: path }
        )
        throw new Error("SVELTHREE Exception (see warning above)")
    }

    /**
     * see https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/crossorigin
     *  TODO  implement crossOrigin
     */
    //export let crossOrigin = "" // default 'anonymous' same as ""

    export let manager: LoadingManager

    let loader: GLTFLoader
    let dracoLoader: DRACOLoader
    let content: GLTF

    manager ? (loader = new GLTFLoader()) : (loader = new GLTFLoader(manager))

    draco
        ? ((dracoLoader = new DRACOLoader()),
          dracoLoader.setDecoderPath(dracoPath),
          loader.setDRACOLoader(dracoLoader))
        : null

    //we want this to be reactive, so we can change GLTF  TODO : check it
    $: if (path) {
        doLoad()
    } else {
        console.warn(
            "SVELTHREE > LoadedGLTF : You have to provide a 'path' prop!",
            { path: path }
        )
        throw new Error("SVELTHREE Exception (see warning above)")
    }

    function onProgress(xhr: ProgressEvent): void {
        dispatch("progress", { total: xhr.total, loaded: xhr.loaded })
    }

    function doLoad(): void {
        //loaded = false // we could display something else here when loading?

        if (async) {
            loader.loadAsync(path, onProgress).then((loadedGLTF: GLTF) => {
                content = loadedGLTF
                dispatch("loaded")
            })
        } else {
            loader.load(
                path,
                function (loadedGLTF) {
                    content = loadedGLTF
                    dispatch("loaded")
                },
                // called while loading is progressing
                function (xhr: ProgressEvent) {
                    dispatch("progress", {
                        total: xhr.total,
                        loaded: xhr.loaded
                    })
                },
                function (error) {
                    console.error(
                        "SVELTHREE > LoadedGLTF : doLoad : An error happened!",
                        error
                    )
                }
            )
        }
    }

    /**
     * Public methods
     */

    export function getAllScenes(): Group[] {
        return content.scenes
    }

    export function getContent(): GLTF {
        return content
    }
</script>
