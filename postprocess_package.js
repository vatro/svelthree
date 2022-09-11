import { writeFile } from "fs"
import { readFile } from "fs"
import { join } from "path"

console.log("POSTPROCESS PACKAGE!")

const project_root_abs = process.cwd()

// Fix generic `mat` shorthand prop 
// replace types `mat` accessors definitions (accessor getter and setter) -> only `Mesh` and `Points`
// this will give us correct intellisense with e.g. `comp_ref.mat = {...}` depending on which material has
// been asigned to the `Mesh` or `Points` component -> e.g.:

const replace_tasks = [
  {
    file_path: join(project_root_abs,`/package/components/Mesh.svelte.d.ts`),
    todo: [
      {
        //regex: /get mat\(\).*}>>;/s,
        //regex: /get mat\(\).*?};/s,
        regex: /get mat\(\).*?>;/s, //opt2
        replacement: `get mat(): MeshProps<AssignedMaterial>['mat'];`
      },
      {
        //regex: /set mat\(.*}>>\);/s,
        regex: /set mat\(.*?\);/s, // opt2
        replacement: `set mat(_: MeshProps<AssignedMaterial>['mat']);`
      }
    ]
  }
  ,
  {
    file_path: join(project_root_abs,`/package/components/Points.svelte.d.ts`),
    todo: [
      {
        //regex: /get mat\(\).*}>>;/s,
        //regex: /get mat\(\).*?};/s,
        regex: /get mat\(\).*?>;/s, //opt2
        replacement: `get mat(): PointsProps<AssignedMaterial>['mat'];`
      },
      {
        //regex: /set mat\(.*}>>\);/s,
        regex: /set mat\(.*?\);/s, // opt2
        replacement: `set mat(_: PointsProps<AssignedMaterial>['mat']);`
      }
    ]
  }
]

const fns = []

const exec_replace_task = (task) => {

  const rep = async () => {

    readFile(task.file_path, 'utf8', (err, content) => {
      if (err) {
        return console.log(err)
      }
    
      if (content) {
        console.log("CONTENT SUCCESS!")
  
        let new_content = content

         // remove wrong indent in source comments
         new_content = new_content.replace(/    \*/g, "*")
  
        for (let i = 0; i < task.todo.length; i++) {
          const todo = task.todo[i]
          new_content = new_content.replace(todo.regex, todo.replacement)
        }

        // always -> insert comments to accessors
        const comments_map = new Map()

        const regex_comments = /(\/\*\ *.*?\*\/)( [A-Za-z].*?\:)/gs // should be correct
        let matches = new_content.match(regex_comments)
        console.log("matches.length", matches.length)

        for (let i = 0; i < matches.length; i++) {
          const split_match = matches[i].split("*/ ")
          let comment = `${split_match[0]}*/`

          // remove wrong indent in target comments
          comment = comment.replace(/    \*/g, "*")

          //get name
          const prop_name = split_match[1].replace("?:", "").replace(":", "")
          console.log("comment:", comment)
          console.log("prop_name:", prop_name)

          comments_map.set(prop_name, comment)
        }

        //console.log(comments_map)

        for (let [prop_name, comment] of comments_map) {
          const str_setter = `set ${prop_name}`
          const regex_setter = new RegExp("\\b" + str_setter + "\\b");
          const test_setter = new_content.match(regex_setter)
          const acc_comment = comment.replace(`/**`, `/**\n\t * ◁▶ _svelthree-component accessor_  \n\t *  \n\t * `)

          if (test_setter) {
            new_content = new_content.replace(`set ${prop_name}`, `${acc_comment}\n\tset ${prop_name}`)
          } else {
            const str_getter = `get ${prop_name}`
            const regex_getter = new RegExp("\\b" + str_getter + "\\b");
            const test_getter = new_content.match(regex_getter)

            if (test_getter) {
              new_content = new_content.replace(`get ${prop_name}()`, `${acc_comment}\n\tget ${prop_name}()`)
            }
           
          }
        }

        writeFile(task.file_path, new_content, (err) => {
          if (err) {
            return console.log(err)
          }
      
          //let prettier_command = `npx prettier --config ./.prettierrc --write src/lib/components/${cnf.component_name}.svelte`
          //exec(prettier_command)
          console.log("FINISHED!")
        })
      } else {
        console.log("NO CONTENT!")
      }
    })

  }

  return rep
}

const do_postprocess = async () => {
  for (let i = 0; i < replace_tasks.length; i++) {
    const task = replace_tasks[i]
    fns.push(exec_replace_task(task))
  }

  for (const fn of fns) {
    await fn()
  }
}

do_postprocess()

//async
/*
readFile(file_path_1, 'utf8', (err, content) => {
	if (err) {
		return console.log(err)
	}

	if (content) {
		console.log("CONTENT SUCCESS!")

    const replace_with_1 = `get mat(): MeshProps<AnyMaterial>['mat'];`
    const replace_with_2 = `set mat(_: MeshProps<AnyMaterial>['mat']);`

    //const regex_1 = /get mat\(\).*}>>;/s
    //const regex_2 = /set mat\(.*}>>\);/s

    const regex_1 = /get mat\(\).*?};/s
    const regex_2 = /set mat\(.*?\);/s

    let new_content = content.replace(regex_1, replace_with_1)
    new_content = new_content.replace(regex_2, replace_with_2)

    writeFile(file_path_1, new_content, (err) => {
      if (err) {
        return console.log(err)
      }
  
      //let prettier_command = `npx prettier --config ./.prettierrc --write src/lib/components/${cnf.component_name}.svelte`
      //exec(prettier_command)
      console.log("FINISHED!")
    })
	} else {
		console.log("NO CONTENT!")
	}

})
*/
