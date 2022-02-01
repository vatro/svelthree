## Comments removed from code 

...but still open (general programming issues), any help is welcome!



removed from: `src/types-extra.ts`
```javascript
/**
 * Replaced all type aliases with union type signatures in order to have more
 * informative hint on hover over JSX attributes. Otherwise only the name if the type
 * alias would show up, with no further information on which types are included.
 *
 * TODO  would like to avoid using long union types, but I couldn't yet figure out
 * how to use the aliases and still have meaningfull hint on hover over JSX attributes.
 */
// export type PropColor = THREE.Vector3 | THREE.Color | number | Array3
// export type PropPos = THREE.Vector3 | Array3
// export type PropRot = THREE.Euler | Array3 | Array4
// export type PropScale = THREE.Vector3 | Array3
// export type PropLookAt = THREE.Vector3 | Array3
// export type PropMatrix4 = THREE.Matrix4
```



removed from: `src/components/CubeCamera.svelte`
```javascript
/*
     not working as expected, currently just rebuilding everything on props change
      TODO  Remove if not possible without rebuilding.
    */

	/*
        let propsIterator: Propeller
        let targetPropsIterator: Propeller
        
        propsIterator = new Propeller(cubeCamera)
        targetPropsIterator = new Propeller(cubeRenderTarget)
    
        $: props
            ? Object.keys(props).length > 0
                ? propsIterator
                    ? propsIterator.tryPropsUpdate(props)
                    : null
                : null
            : null
    */

	/*
     This is not working as expected, we have to rebuild WebGLCubeRenderTarget
     in order to change settings on runtime / reactive
      TODO  Really not possible without rebuilding? Am I missing something?
      TODO  Remove if not possible without rebuilding.
    */

	/*
        $: targetProps
            ? Object.keys(targetProps).length > 0
                ? targetPropsIterator
                    ? (console.debug("REACTIVE!"),
                    targetPropsIterator.tryPropsUpdate(targetProps),
                    (parent.material["envMap"] = cubeCamera.renderTarget.texture),
                    (parent.material["envMap"].needsUpdate = true),
                    (parent.material["needsUpdate"] = true))
                    : null
                : null
            : null
    */
```