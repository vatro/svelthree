# svelthree
#### Create three.js content using Svelte components.
| IMPORTANT REMARK |
| -------|
|`svelthree` is now **"default Svelte first"** (_not "`svelte-accmod` first" as before_), thus **`accessors`usage is not recommended** because of various reasons related to accessors updating components synchronously which can lead to unwanted behavior, bugs and perfomance issues. So if you're using component references and wish to set props programmatically, please use the default `$set` method, e.g. `comp_ref.$set({pos: [1,2,3]})`, which is asynchronous / scheduled. If you still want to access `svelthree`-components via `accessors` syntax, e.g. `comp_ref.pos = [1,2,3]`, please import accessors-enabled components from `svelthree/acc` which will then have correct / better type definitions.
_I still like the developer experience with `svelte-accmod` a bit better, but it comes with some other, currently still unsolved issues and an inevitable perfomance loss compared to using the `$set` method. Although `svelthree` is now "default Svelte first", `svelte-accmod` is still something I'll get my hands on again in future._ |

---

### How to try latest svelthree NOW ?

- **clone the svelthree repo**

  e.g. using [degit](https://github.com/Rich-Harris/degit): `npx degit vatro/svelthree`

- **create a svelthree-tarball and save it somewhere** *(see [npm pack](https://docs.npmjs.com/cli/v7/commands/npm-pack))*

  open a new terminal from `svelthree` root folder and:

  `npm i`
  `npm run build`
  `cd package`

  open a new terminal from `package` folder and:
  `npm pack --pack-destination ../some_directory/` 

- **install the created svelthree-tarball**

  e.g. in your existing SvelteKit-project (see [`create-svelte`](https://www.npmjs.com/package/create-svelte)) add `"svelthree"` to `"devDependencies"` inside `package.json` file:

  ```
  "devDependencies": {
      ...
      "svelthree": "file:../some_directory/svelthree-1.0.0-next.0.98.tgz",
      ...
  }
  ```

  ... and **run** `npm i`  (*this will actually install `svelthree` and if not already installed: `three` incl. `@types/three`*)
  
- Depending on your Svelte / SvelteKit project, you'll probably need to make some configuration changes (*svelthree-starters coming soon!*), but you're basically **ready to rumble!** 🚀
---



## 1.0.0-next.x DRAFT

Create [three.js](https://threejs.org/) content using [Svelte](https://svelte.dev/docs) components.

👨🏻‍💻 Please keep in mind that updates may come frequently and include breaking changes.



### Install

​	In your **SvelteKit** project:

- install **three.js** along with **three.js types**

  ```
  npm i -D three @types/three
  ```

- install **svelthree**

  ```
  npm i -D svelthree@next
  ```

**Note:** If you don't install a specific Svelte or three.js version, the latest supported *Svelte* and *three.js* (incl. types) versions will be automatically installed as *svelthree's* peer dependencies.




### Quickstart

- ***todo**: create new svelthree-app (publish after svelthree 1.0.0-next.1 release)*

### General Usage

- ***todo**: new Vercel hosted SvelteKit website with some cool examples*

### Examples

- ***todo**: new Vercel hosted SvelteKit website incl. REPL*


### Usage Example

```svelte
<!-- HelloCube.svelte -->

<script>
  import {
    Canvas,
    Scene,
    PerspectiveCamera,
    DirectionalLight,
    AmbientLight,
    Mesh,
    WebGLRenderer
  } from "svelthree";
  
  import { Fog, BoxGeometry, MeshStandardMaterial } from "three";

  const fog = new Fog(0xffffff, 3, 11);
  const geometry = new BoxGeometry(1, 1, 1);
  const material = new MeshStandardMaterial();
 
</script>

<Canvas w={500} h={500} >

  <Scene id="scene1" bg={0xf0f9ff} props={{ fog }} env_tex={{ url: '...' }} >

    <PerspectiveCamera id="cam1" pos={[0, 0, 3]} lookAt={[0, 0, 0]} />
    <AmbientLight intensity={1.25} />
    <DirectionalLight pos={[3, 3, 3]} shadowMapSize={512*4} />

    <Mesh
      geometry
      material
      mat={{ color: 0xff3e00, metalness: 1, roughness: 0, envMapIntensity: 0.8 }}
      pos={[0, 0, 0]}
      rot={[0.5, 0.6, 0]}
      scale={[1, 1, 1]}
      receiveShadow
      castShadow
      />

  </Scene>

  <WebGLRenderer
    sceneId="scene1"
    camId="cam1"
    mode="always"
    config={{ antialias: true, alpha: false }}
    shadowmap
    />

</Canvas>
```

