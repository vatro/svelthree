<script lang="ts" context="module">
	import type { default as WebGLRenderer } from "../components/WebGLRenderer.svelte"

	/** Execute a callback on a specific `WebGLRenderer` component's render function event only **once**.
	 * Has the ability to skip (`skip_frames: number`) a specific amout of render calls. */
	export const once_on_render_event = (
		renderer_component: WebGLRenderer,
		event_name: string,
		callback: () => void,
		skip_frames = 0
	) => {
		let skip = 0
		let remove_on_render_event: (() => void) | undefined | null = undefined

		function check() {
			if (skip === skip_frames) {
				callback()
				if (remove_on_render_event) remove_on_render_event()
				remove_on_render_event = null
				skip = 0
			} else {
				skip++
			}
		}

		remove_on_render_event = renderer_component.$on(event_name, check)
	}
</script>
