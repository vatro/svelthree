import type { Writable } from "svelte/store"
import { writable } from "svelte/store"
import type { StoreBody } from "./components/Canvas.svelte"

export const svelthreeStores: Writable<StoreBody[]> = writable([])
