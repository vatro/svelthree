# svelthree
#### Svelte powered three.js development

## 1.0.0 DRAFT

[Svelte](https://svelte.dev/) components library for declarative construction of reactive and reusable [three.js](https://threejs.org/) scene graphs ~~utilizing three.js source in a slightly modified version [svelthree-three](https://github.com/vatro/svelthree-three)~~.  *[**tbd**] Bye-bye something like svelthree-three, we should now be (want to be) (almost?) three-version agnostic, lowest supported version is yet to be determined...*
*also: hello [svelte-accmod](https://github.com/vatro/svelte-accmod)!*

👨🏻‍💻 Keep in mind that svelthree is still in an early "proof of concept" development phase and many cool features are yet to be added, so the API may change in future releases while always aiming to provide a rich feature stack along with the best possible developer experience.



#### Install

*[**tbd**] This will not be THAT simple anymore, since we're now using [svelte-accmod](https://github.com/vatro/svelte-accmod)*:

- `npm i -D svelthree` *(not published yet!)*

- `npx svelte-accmod-patch ` 




#### Quickstart
*[**tbd**] This will not be THAT simple anymore, since we're now using [svelte-accmod](https://github.com/vatro/svelte-accmod)*

- ***todo**: create new Svelte TypeScript template app (publish after 1.0.0 release)*

- ***todo**: create SvelteKit template app (publish after 1.0.0 release)*

  

#### General Usage

~~Visit [svelthree.dev](https://svelthree.dev/) for usage examples, API *coming soon*, FAQ and a REPL playground! 😎~~

- ***todo**: new Vercel hosted SvelteKit website with some cool examples*



#### REPL Usage

~~You can try out svelthree without installing anything in a Svelte REPL environment:~~

~~see [svelte.dev REPL](https://svelte.dev/repl/c574fbeea12740a5a33017448f68bf6b?version=3.24.0)~~

~~see [svelthree.dev REPL](https://svelthree.dev/repl/76272e38334347e8a4c900e5bd58b56a?version=3.24.0)~~

~~☝️ but here you have to import  `from "https://unpkg.com/svelthree@latest/dist/svelthree.mjs" `~~

***todo (?)**: with the new Vercel hosted SvelteKit website ->  implement REPL (not quite not sure about this though... probably just for people to play around, without login / saving?)*



#### Usage Example

🥳  no more `let:sti`, `{sti}` ,`let:scene`, `{scene}`, `let:parent` or `{parent}`!

➕ more cool improvements and new features! 🚀

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
    config={{ antialias: true, alpha: false }}
    enableShadowMap
    />

</Canvas>
```

