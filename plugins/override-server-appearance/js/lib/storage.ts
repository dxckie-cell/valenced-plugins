export interface ServerOverride {
	id: string
	icon: string
	banner: string
}

export interface Storage {
	overrides: ServerOverride[]
}

export const DEFAULTS: Storage = { overrides: [] }
