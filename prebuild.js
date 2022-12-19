import * as fsp from "node:fs/promises"
import * as path from "path"

const get_all_files_by_extension = async (dir, ext) => {
	let files = await fsp.readdir(dir, { withFileTypes: true })
	return files.filter((f) => f.isFile() && path.extname(f.name) === ext).map((f) => f.name)
}

const change_paths_add_accessors = async (filename, lib_path) => {
	const content = await fsp.readFile(`${lib_path}/acc/components/${filename}`, "utf8")
	let new_content = content.replace(/(from "..\/)/g, `from "../../`)
	new_content = new_content.replace(/(from ".\/)/g, `from "../`)

	// revert path changes to components (except internal ones)
	new_content = new_content.replace(/(from "..\/Canvas.svelte)/g, `from "./Canvas.svelte`)
	new_content = new_content.replace(/(from "..\/CubeCamera.svelte)/g, `from "./CubeCamera.svelte`)
	new_content = new_content.replace(/(from "..\/Mesh.svelte)/g, `from "./Mesh.svelte`)
	new_content = new_content.replace(/(from "..\/Object3D.svelte)/g, `from "./Object3D.svelte`)
	new_content = new_content.replace(/(from "..\/PerspectiveCamera.svelte)/g, `from "./PerspectiveCamera.svelte`)
	new_content = new_content.replace(/(from "..\/OrthographicCamera.svelte)/g, `from "./OrthographicCamera.svelte`)

	// add `<svelte:options accessors />`
	new_content = `<svelte:options accessors />\n` + new_content

	await fsp.writeFile(`${lib_path}/acc/components/${filename}`, new_content)
}

const create_acc_index = async (lib_path) => {
	await fsp.copyFile(`${lib_path}/index.ts`, `${lib_path}/acc/index.ts`)
	const content_index = await fsp.readFile(`${lib_path}/acc/index.ts`, "utf8")
	let new_content_index = content_index.replace(/(".\/types)/g, `"../types`)
	await fsp.writeFile(`${lib_path}/acc/index.ts`, new_content_index)
}

const create_acc_stores_index = async (lib_path) => {
	const content_index = `export * from "../../stores"`
	await fsp.writeFile(`${lib_path}/acc/stores/index.ts`, content_index)
}

const create_acc_utils_index = async (lib_path) => {
	const content_index = `export * from "../../utils"`
	await fsp.writeFile(`${lib_path}/acc/utils/index.ts`, content_index)
}

const do_prebuild = async () => {
	console.log("🤖 SVELTHREE > prebuilding...")

	const project_root_abs = process.cwd()
	const lib_path = `${project_root_abs}/src/lib/`

	// create temp `acc` folder
	await fsp.mkdir(`${lib_path}/acc`)

	// create temp `acc/stores` folder
	await fsp.mkdir(`${lib_path}/acc/stores`)

	// create temp `acc/utils` folder
	await fsp.mkdir(`${lib_path}/acc/utils`)

	// `src/lib/acc/components` (copy all .svelte components from `src/lib/components`)
	await fsp.mkdir(`${lib_path}/acc/components`)
	const all_svelte_components = await get_all_files_by_extension(`${lib_path}/components`, ".svelte")
	//console.log(all_svelte_components)

	for (let i = 0; i < all_svelte_components.length; i++) {
		const filename = all_svelte_components[i]
		await fsp.copyFile(`${lib_path}/components/${filename}`, `${lib_path}/acc/components/${filename}`)
	}

	// edit `*.svelte` components in `src/lib/acc/components`:
	// - change import paths to target `src/lib/` one level up
	// - add <svelte:options accessors> to the top

	for (let i = 0; i < all_svelte_components.length; i++) {
		const filename = all_svelte_components[i]
		await change_paths_add_accessors(filename, lib_path)
	}

	// create and edit src/lib/acc/index.ts
	await create_acc_index(lib_path)
	// create and edit src/lib/acc/stores/index.ts
	await create_acc_stores_index(lib_path)
	// create and edit src/lib/acc/utils/index.ts
	await create_acc_utils_index(lib_path)

	console.log("✔️  SVELTHREE > prebuild finished!")
}

do_prebuild()
