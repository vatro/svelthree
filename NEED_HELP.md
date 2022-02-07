## JSX attributes intellisense with TS Union Types (VSCode)

removed from: `src/types-extra.ts`
```javascript
/**
 * Replaced all type aliases with union type signatures in order to have more
 * informative hint on hover over JSX attributes. Otherwise only the name of the type
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

