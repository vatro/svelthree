/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_SVELTHREE_VERBOSE: string
	// more env variables...
}

interface ImportMeta {
	readonly env: ImportMetaEnv
}
