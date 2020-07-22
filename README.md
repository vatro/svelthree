# svelthree
#### Svelte powered three.js development



[Svelte](https://svelte.dev/) components library for declarative construction of reactive and reusable [three.js](https://threejs.org/) scene graphs utilizing three.js source in a slightly modified version [svelthree-three](https://github.com/vatro/svelthree-three). 

👨🏻‍💻 Keep in mind that svelthree is still in an early "proof of concept" development phase and many cool features are yet to be added, so the API may change in future releases while always aiming to provide a rich feature stack along with the best possible developer experience.



#### Install
```
npm i svelthree --save-dev
```




#### Quickstart
Svelthree components' code is written in **TypeScript**. You can set up a **[new Svelte TypeScript project (official)](https://svelte.dev/blog/svelte-and-typescript)** like this:

```
npx degit sveltejs/template svelte-typescript-app
cd svelte-typescript-app
node scripts/setupTypeScript.js
```

After that install svelthree by executing `npm i svelthree --save-dev ` in your project folder. That's it!  🎉
🍦 You don't have to write TypeScript in order to use svelthree-components, change `<script lang="ts">` to `<script>`  and do it VanillaJS! 




#### Usage

Visit [**svelthree.dev**](https://svelthree.dev/) (*new website will be live few hours after 0.118.0 release*) for various usage examples, API, FAQ and a REPL playground! 😎

##### Code Example

```html
<!-- HelloCube.svelte -->

<script>
  import {
    Canvas,
    Scene,
    PerspectiveCamera,
    DirectionalLight,
    AmbientLight,
    BoxBufferGeometry,
    Mesh,
    MeshStandardMaterial,
    WebGLRenderer,
  } from "svelthree";

  let cubeGeometry = new BoxBufferGeometry(1, 1, 1);
  let cubeMaterial = new MeshStandardMaterial();
</script>

<Canvas let:sti w={500} h={500}>

  <Scene {sti} let:scene id="scene1" props={{ background: 0xedf2f7 }}>

    <PerspectiveCamera {scene} id="cam1" pos={[0, 0, 3]} lookAt={[0, 0, 0]} />
    <AmbientLight {scene} intensity={1.25} />
    <DirectionalLight {scene} pos={[3, 3, 3]} />

    <Mesh
      {scene}
      geometry={cubeGeometry}
      material={cubeMaterial}
      mat={{ roughness: 0.5, metalness: 0.5, color: 0xff3e00 }}
      pos={[0, 0, 0]}
      rot={[0.5, 0.6, 0]}
      scale={[1, 1, 1]} />

  </Scene>

  <WebGLRenderer
    {sti}
    sceneId="scene1"
    camId="cam1"
    config={{ antialias: true, alpha: false }} />

</Canvas>
```

