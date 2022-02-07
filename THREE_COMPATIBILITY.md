# Three.js Compatibility

This document collects potential compatibility issues.

Ideally, *svelthree* would be three-version agnostic and with the current project setup this seems to be **almost** (90-95%?) the case, yet it isn't 100%, why? Because *svelthree* isn't mirroring the API of any possible (installed) three.js version 1:1 into Svelte components + attributes.

The latest version of svelthree wil always be 100% compatible to the latest version of three. If you use svelthree with lower three-versions and encounter some compatibility issues, please feel free to contribute them to this document!



## three <= 0.131.x

- **gltf-to-comps-1** test (*currently not in repo*)

  Loaded GLTF 2.0 Model (*Buggy*) looks darker (duller, actually correct) than three >= 0.131.x :
  
  This is most probably due to the **new PMREM intergration**, so not a problem with *svelthree* see:
  
  https://github.com/mrdoob/three.js/releases/tag/r131
  
  https://github.com/mrdoob/three.js/pull/22178
  
  https://github.com/mrdoob/three.js/pull/22199
  
  https://github.com/mrdoob/three.js/issues/22236
  
  All Meshes inside the test scene (floor + GLTF) have a **PBR Material** (*MeshStandardMaterial*) which has issues with the new PMREM integeration, not only on a CubeCamera-level, see [issuecomment-925453266](https://github.com/mrdoob/three.js/issues/22236#issuecomment-925453266).



## three <= 0.125.x

- **CubeCamera component:**

  **CHECK / FIX** (???): **No cubecam texture!** ( *no errors / warnings thrown* )