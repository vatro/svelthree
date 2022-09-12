### IN CASE YOU'RE HERE BECAUSE YOU WERE LOOKING FOR SVELTE THREE SOMETHING:
There's an **impressive (_pretty new_) three.js component library for Svelte: [threlte website](https://threlte.xyz/) / [threlte repo](https://github.com/threlte/threlte)** which is (_atm_) far more feature rich, complete and polished compared to `svelthree`. Also: **it's powered by Vercel + Rich Harris likes it a lot too!**

Although the completeness of `threlte` could demotivate me concerning further `svelthree` development, I'm going to continue working on `svelthree` because it's my baby and I love it 🥰. Also: the API / DX / capability is / will be different to `threlte` in quite a few ways and I think it's always good to have alternatives.

Thanks for dropping by & stay tuned! 🚀 + feel free to try `svelthree` & leave a star! 😁👋

---


# svelthree

#### Create three.js content with Svelte components.

---

#### How to try latest svelthree NOW ?

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

  e.g. in your existing Svelte-project add `"svelthree"` to `"devDependencies"` inside `package.json` file:

  ```
  "devDependencies": {
      ...
      "svelthree": "file:../some_directory/svelthree-1.0.0-next.0.95.tgz",
      ...
  }
  ```

  ... and **run** `npm i`  (*this will actually install svelthree*)

  

- **patch original (*installed*) Svelte to [svelte-accmod](https://github.com/vatro/svelte-accmod)**

  run: `npx svelte-accmod-patch`
  
- Depending on your Svelte / SvelteKit project, you'll probably need to make some configuration changes (*svelthree-starters coming soon!*), but you're basically **ready to rumble!** 🚀


---



## 1.0.0-next.x DRAFT

[Svelte](https://svelte.dev/) components library for declarative construction of reactive and reusable [three.js](https://threejs.org/) scene graphs using a modified version of Svelte *[svelte-accmod](https://github.com/vatro/svelte-accmod)* under the hood. 👨🏻‍💻 Please keep in mind that updates may come frequently and include breaking changes.



### Install

​	In your **Svelte** 3.44.2 - 3.49.0 project (also **SvelteKit**):

- install **three.js** along with **three.js types** (*if available*):

  ```
  npm i -D three @types/three
  ```

- install **svelthree** and patch Svelte to **svelte-accmod**

  ```
  npm i -D svelthree@next
  ```

  ```
  npx svelte-accmod-patch
  ```

**Note:** If you don't install a specific Svelte or three.js version, the latest supported *Svelte* (svelte-accmod patched) and *three.js* versions will be automatically installed as *svelthree's* peer dependencies.




### Quickstart
- ***todo**: create new svelthree-app-**rollup** template -> CSR/SPA (publish after svelthree 1.0.0-next.1 release)*
- ***todo**: create new svelthree-app-**vite** template -> CSR/SPA (publish after svelthree 1.0.0-next.1 release)*
- ***todo**: create new svelthree-app-**sveltekit** template -> SSR + CSR/SPA (publish after svelthree 1.0.0-next.1 release)*



### General Usage

- ***todo**: new Vercel hosted SvelteKit website with some cool examples*



### REPL Usage

***todo (?)**: with the new Vercel hosted SvelteKit website ->  implement REPL (not quite not sure about this though... probably just for people to play around, without login / saving?)*



### Usage Example

```svelte
<!-- HelloCube.svelte -->

<script>
  import {
    Canvas,
    Scene,
    Fog,
    PerspectiveCamera,
    DirectionalLight,
    AmbientLight,
    BoxBufferGeometry,
    Mesh,
    MeshStandardMaterial,
    WebGLRenderer,
  } from "svelthree";

  const fog = new Fog(0xffffff, 3, 11);
  const geometry = new BoxBufferGeometry(1, 1, 1);
  const material = new MeshStandardMaterial();
 
</script>

<Canvas w={500} h={500}>

  <Scene
    id="scene1"
    bg={0xf0f9ff}
    props={{ fog }}
    env_tex={{ url: '...' }}
    >

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

