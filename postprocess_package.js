import * as fsp from "node:fs/promises"
import * as path from "path"

export const postprocess_package = async (target_folder, using_accessors) => {
	const project_root_abs = process.cwd()
	const fns = []

	// --- CODE REPLACEMENT TASKS ---

	const replace_tasks = [
		{
			file_path: path.join(project_root_abs, `/${target_folder}/components/Mesh.svelte.d.ts`),
			todo: [
				{
					//regex: /get mat\(\).*}>>;/s,
					//regex: /get mat\(\).*?};/s,
					regex: /get mat\(\).*?>;/s, //opt2
					//replacement: `get mat(): MeshProps<AssignedMaterial>['mat'];`
					replacement: `get mat(): PropMat<AssignedMaterial>;`
				},
				{
					//regex: /set mat\(.*}>>\);/s,
					regex: /set mat\(.*?\);/s, // opt2
					//replacement: `set mat(_: MeshProps<AssignedMaterial>['mat']);`
					replacement: `set mat(_: PropMat<AssignedMaterial> | undefined);`
				},
				{
					regex: /Mesh<MeshAssignableMaterial>/g,
					replacement: `Mesh<AssignedMaterial>`
				}
			]
		},
		{
			file_path: path.join(project_root_abs, `/${target_folder}/components/Points.svelte.d.ts`),
			todo: [
				{
					//regex: /get mat\(\).*}>>;/s,
					//regex: /get mat\(\).*?};/s,
					regex: /get mat\(\).*?>;/s, //opt2
					//replacement: `get mat(): PointsProps<AssignedMaterial>['mat'];`
					replacement: `get mat(): PropMat<AssignedMaterial>;`
				},
				{
					//regex: /set mat\(.*}>>\);/s,
					regex: /set mat\(.*?\);/s, // opt2
					//replacement: `set mat(_: PointsProps<AssignedMaterial>['mat']);`
					replacement: `set mat(_: PropMat<AssignedMaterial> | undefined);`
				},
				{
					regex: /Points<PointsAssignableMaterial>/g,
					replacement: `Points<AssignedMaterial>`
				}
			]
		}
	]

	/**
	 * Replace some code in generated package-files.
	 */
	const exec_replace_task = (task) => {
		const rep = async () => {
			const content = await fsp.readFile(task.file_path, "utf8")
			//console.log(!content ? content : "content ok!")

			try {
				//console.log("CONTENT SUCCESS!")

				let new_content = content

				// remove wrong indent in source comments
				//new_content = new_content.replace(/    \*/g, "*")

				for (let i = 0; i < task.todo.length; i++) {
					const todo = task.todo[i]
					new_content = new_content.replace(todo.regex, todo.replacement)
				}

				await fsp.writeFile(task.file_path, new_content)
			} catch (err) {
				console.error(err)
			}
		}

		return rep
	}

	// --- ACCESSOR-JSDOC-COMMENTS OPTIMIZATION TASKS ---

	/**
	 * Apply comments to accessors definitions -> intellisense will show them when e.g. `comp_ref.foo` (otherwise only 'accessors' will be shown)
	 */
	const apply_comments_to_accessors_defs = async () => {
		//console.log("apply_comments_to_accessors_defs!")

		const all_files = []

		// get './package/components/*.d.ts' file-paths
		const folder_components = path.join(project_root_abs, `/${target_folder}/components`)

		try {
			const files = await fsp.readdir(folder_components, { withFileTypes: false })

			for (const file of files) {
				//console.log(file)
				if (file.includes(`.d.ts`)) {
					all_files.push(`${folder_components}\\${file}`)
				}
			}
		} catch (err) {
			console.error(err)
		}

		// get './package/components-internal/*.d.ts' file-paths

		if (!using_accessors) {
			const folder_components_internal = path.join(project_root_abs, `/${target_folder}/components-internal`)

			try {
				const files = await fsp.readdir(folder_components_internal, { withFileTypes: false })
				for (const file of files) {
					//console.log(file)
					if (file.includes(`.d.ts`)) {
						all_files.push(`${folder_components_internal}\\${file}`)
					}
				}
			} catch (err) {
				console.error(err)
			}
		}

		//console.log("apply_comments_to_accessors_defs! -> all files:", all_files)

		for (const file of all_files) {
			const fn_process_comments = get_process_comments_fn(file)
			fns.push(fn_process_comments)
		}
	}

	const get_process_comments_fn = (file_path) => {
		const process_comments_fn = async () => {
			// read file content
			//console.log(`process_comments_fn -> ${file_path}`)

			try {
				const content = await fsp.readFile(file_path, "utf8")
				let new_content = content

				// remove wrong indent in source comments
				// EDIT: leave generated as they are
				//new_content = new_content.replace(/ +\*/g, "    *")
				//new_content = new_content.replace(/    \* /g, "* ")
				//new_content = new_content.replace(/        \*/g, "*")

				//always -> insert comments to accessors
				const comments_map = new Map()

				const regex_comments = /(\/\*\*.*?\*\/)( [A-Za-z].*?:)/gs // should be correct
				let matches = new_content.match(regex_comments)
				//console.log("matches.length", matches.length)

				if (matches) {
					for (let i = 0; i < matches.length; i++) {
						const split_match = matches[i].split("*/ ")
						let comment = `${split_match[0]}*/`

						// remove wrong indent in accessors comments only
						comment = comment.replace(/ + \* /g, "\t * ")
						comment = comment.replace(/ +\*\//g, "*/")
						comment = comment.replace(/^\*\//gm, "\t*/")
						comment = comment.replace(/\*\//g, " */")

						//get name
						const prop_name = split_match[1].replace("?:", "").replace(":", "")
						//console.log("comment:", comment)
						//console.log("prop_name:", prop_name)

						comments_map.set(prop_name, comment)
					}

					//console.log(comments_map)

					for (let [prop_name, comment] of comments_map) {
						const str_setter = `set ${prop_name}`
						const regex_setter = new RegExp(str_setter)
						const test_setter = content.match(regex_setter)
						let acc_comment
						if (using_accessors) {
							acc_comment = comment.replace(
								`/**`,
								`/**\n\t * ◁▶ _svelthree-component accessor_  \n\t *  \n\t *`
							)
						} else {
							acc_comment = comment.replace(
								`/**`,
								`/**\n\t * ◁▶ _svelthree-component method / read-only prop_  \n\t *  \n\t *`
							)
						}

						if (test_setter) {
							new_content = new_content.replace(
								`set ${prop_name}(_`,
								`${acc_comment}\n\tset ${prop_name}(_`
							)
						} else {
							const str_getter = `get ${prop_name}`
							const regex_getter = new RegExp("\\b" + str_getter + "\\b")
							const test_getter = content.match(regex_getter)

							if (test_getter) {
								new_content = new_content.replace(
									`get ${prop_name}()`,
									`${acc_comment}\n\tget ${prop_name}()`
								)
							}
						}
					}

					// remove double `/**accessor*/` before comments
					new_content = new_content.replace(/(\/\*\*accessor\*\/)(\r\n|\r|\n)( +)(\/\*\*)/gm, "$4")

					// replace generated `/**accessor*/` with svelthree-accessors comment

					new_content = new_content.replace(
						/\/\*\*accessor\*\//gs,
						"/** ◁▶ _svelthree-component accessor_ */"
					)

					//new_content = new_content.replace(/\/\*\*accessor\*\//gs, "/** ◁▶ _svelthree-component method_ */")

					await fsp.writeFile(file_path, new_content)
				}
			} catch (err) {
				console.error(err)
			}
		}

		return process_comments_fn
	}

	// --- ENTRY POINT ---

	const schedule_code_replacement_tasks = true

	/**
	 * - Fix generic `mat` shorthand property type when using accessors:
	 * 	- Replace `mat` accessors type definitions (accessor getter and setter) -> only `Mesh` and `Points`,
	 * this will give us correct intellisense with e.g. `comp_ref.mat = {...}` depending on which material has
	 * been asigned to the `Mesh` or `Points` component.
	 * ---
	 * - Optimize all accessors-jsdoc-comments:
	 * 	- Copy accessors-comments from `__propDef` to `class` definition.
	 * 	- Fix any comment-indentation issues (_only in `class` definition, leaving generated `__propDef` comments as they are_)
	 * 	- Add svelthree-specific accessors-hint: ◁▶ _svelthree-component accessor_
	 * ---
	 */
	const do_postprocess = async () => {
		console.log(`🤖 SVELTHREE > post-processing package '${target_folder}': started...`)

		// schedule code replacement tasks
		if (schedule_code_replacement_tasks) {
			console.log(`🤖 SVELTHREE > post-processing package '${target_folder}': scheduling replacement tasks...`)
			for (let i = 0; i < replace_tasks.length; i++) {
				const task = replace_tasks[i]
				fns.push(exec_replace_task(task))
			}
		}

		// schedule accessors-comments optimization in `d.ts` files
		console.log(
			`🤖 SVELTHREE > post-processing package '${target_folder}': scheduling accessors-comments optimization tasks...`
		)
		await apply_comments_to_accessors_defs()

		// execute all scheduled tasks
		console.log(`🤖 SVELTHREE > post-processing package '${target_folder}': executing all scheduled tasks...`)
		for (const fn of fns) {
			try {
				await fn()
			} catch (err) {
				console.log(err)
			}
		}

		console.log(`✔️  SVELTHREE > post-processing package '${target_folder}': done!\n`)
	}

	await do_postprocess()
}

await postprocess_package("package", false)
await postprocess_package("package/acc", true)

console.log(`✔️✔️  SVELTHREE > post-processing "package" and "package/acc": finished!\n`)
