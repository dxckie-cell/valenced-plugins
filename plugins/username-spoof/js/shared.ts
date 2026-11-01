export interface Settings {
	username: string
	displayName: string
}

export const DefaultSettings: Settings = {
	username: '',
	displayName: '',
}

// Lets the settings screen make everything showing your name update
let refresh: (() => void) | undefined

export const setRefresh = (fn: (() => void) | undefined) => {
	refresh = fn
}

export const refreshUsers = () => refresh?.()
