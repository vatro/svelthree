<script lang="typescript">
    import { onMount } from "svelte"
    import { get_current_component } from "svelte/internal"
    import { WebGLCubeRenderTarget, CubeCamera, Mesh } from "svelthree-three"
    import { UniversalPropIterator } from "../utils/UniversalPropIterator.svelte"
    import { svelthreeStores } from "../stores.js"

    let self = get_current_component()
    export let scene = undefined
    export let parent:Mesh = undefined // Mesh

    let sti: number

    if (scene) {
        if (scene.type === "Scene") {
            setSTI()
        } else {
            console.warn(
                "SVELTHREE > Mesh : You have to provide a valid 'scene' prop of type 'Scene'!",
                { scene: scene }
            )
            throw new Error("SVELTHREE Exception (see warning above)")
        }
    } else {
        console.warn("SVELTHREE > Mesh : You have to provide a {scene} prop!", {
            scene: scene
        })
        throw new Error("SVELTHREE Exception (see warning above)")
    }


    export let near: number = 1
    export let far: number = 1000
    //export let props: { [key: string]: any } = {} // CubeCamera props
    export let targetProps: { [key: string]: any } = {} // WebGLCubeRenderTarget props
    export let targetSize:number = 128

    //let propsIterator: UniversalPropIterator
    //let targetPropsIterator: UniversalPropIterator

    let cubeRenderTarget = new WebGLCubeRenderTarget( targetSize, targetProps );
    let cubeCamera = new CubeCamera( near, far, cubeRenderTarget );

    if(parent.material.hasOwnProperty("envMap")) {
        parent.material["envMap"] =  cubeRenderTarget.texture
    }
    
    scene.add( cubeCamera );

    $svelthreeStores[sti].cubeCameras.push(self)

    // Update the render target cube
    // call it from WebGL Renderer
    export function doUpdate() {
        if($svelthreeStores[sti].currentSceneIndex) {
            parent.visible = false;
            cubeCamera.position.copy( parent.position );
            let renderer = $svelthreeStores[sti].renderer
            let scene = $svelthreeStores[sti].scenes[$svelthreeStores[sti].currentSceneIndex - 1].scene
            //console.warn(renderer)
            //console.warn(scene)
            //console.log("doUpdate cubecam")
            cubeCamera.update( renderer, scene );
            parent.visible = true;
        }
    }

    function setSTI() {
        if (scene.userData.sti >= 0) {
            sti = scene.userData.sti
        } else {
            console.warn(
                "SVELTHREE > Mesh : Failed to set 'sti' from 'scene.userData.sti', 'sti' has to be >= 0!",
                {
                    scene: scene,
                    userData: scene.userData,
                    sti: scene.userData.sti
                }
            )
            throw new Error("SVELTHREE Exception (see warning above)")
        }
    }
</script>
