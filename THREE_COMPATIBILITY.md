# Three.js Compatibility



Ideally, *svelthree* would be three-version agnostic and with the new project setup this seems to be **almost** (90-95%?) the case, but it isn't 100%, why? Because *svelthree* isn't translating the API of any Three.js version 1:1 into Svelte components + attributes.

This document collects potential compatibility issues.



## three <= 0.131.x

- **gltf-to-comps-1** test (*currently not in repo*)

  Loaded GLTF 2.0 Model (*Buggy*) looks darker (duller) than three > 0.131.x :
  
  This is most probably due to the **new PMREM intergration**, so not a problem weith *svelthree* see:
  
  https://github.com/mrdoob/three.js/releases/tag/r131
  
  https://github.com/mrdoob/three.js/pull/22178
  
  https://github.com/mrdoob/three.js/pull/22199
  
  https://github.com/mrdoob/three.js/issues/22236
  
  All Meshes inside the test scene (floor + GLTF) have a **PBR Material** (*MeshStandardMaterial*) which seems to have some problems with the new PMREM integeration, not only on a CubeCamera-level, see [issuecomment-925453266](https://github.com/mrdoob/three.js/issues/22236#issuecomment-925453266).



## three <= 0.125.x

- **CubeCamera component:**

  **CHECK / FIX** (???): **No cubecam texture!** ( *no errors / warnings thrown* )