// Capri Pet for Valenced: a neon cyber-kitten that floats over the app and chases your finger.
// Port of choccychan's (OTKUSteyler) Capri Pet from chocos-plugins.

import type { JsonStorage } from '@valenced/json-storage'
import { getModules } from '@valenced/modules/finders'
import { withName } from '@valenced/modules/finders/filters'
import { after } from '@valenced/patcher'
import { createElement, Fragment } from 'react'
import PetOverlay, { PetHost } from './Pet'
import { newPet, type PetState, tick } from './pet'

// Hosts that wrap the whole app (so touches can be watched and chased), best first,
// then a fallback that can only draw the pet.
const FULL_HOSTS = ['AppContainer', 'App']
const OVERLAY_HOSTS = ['AppToastContainer']

// One shared pet object: the overlay reads it live and `save` writes it to disk.
const pet: PetState = newPet()
let storage: JsonStorage<PetState> | undefined
let saveTimer: ReturnType<typeof setTimeout> | undefined

const save = () => {
	if (!storage) return
	clearTimeout(saveTimer)
	saveTimer = setTimeout(
		() => storage?.set({ ...pet, rev: undefined }, true),
		400,
	)
}

/** The component may be a plain function, memo() or forwardRef(). */
function findPatchTarget(exports: any): [any, string] | undefined {
	const d = exports?.default
	if (typeof d === 'function') return [exports, 'default']
	if (typeof d?.type === 'function') return [d, 'type']
	if (typeof d?.render === 'function') return [d, 'render']
}

export default plugin<{ jsonStorage: PetState }>({
	jsonStorage: { default: newPet(), load: true },

	start(api) {
		// Wrapping the app root only takes effect on the next mount, so enabling mid-session needs a reload.
		if (api.plugin.startedLate) {
			api.plugin.requireReload()
			return
		}

		storage = api.jsonStorage
		api.cleanup(() => {
			clearTimeout(saveTimer)
			storage = undefined
		})

		// Load the saved pet and hand it to the already-mounted overlay.
		api.jsonStorage
			.get()
			.then(saved => {
				Object.assign(pet, saved)
				tick(pet)
				pet.rev = (pet.rev ?? 0) + 1
			})
			.catch(e => api.plugin.reportError(e))

		let hosted = false
		const hook = (name: string, full: boolean) => {
			api.cleanup(
				getModules(withName<any>(name), exports => {
					if (hosted) return
					try {
						const target = findPatchTarget(exports)
						if (!target) return
						api.cleanup(
							after(target[0], target[1], (ret: any) =>
								full
									? createElement(PetHost, { pet, save }, ret)
									: createElement(
											Fragment,
											null,
											ret,
											createElement(PetOverlay, { pet, save }),
										),
							),
						)
						hosted = true
					} catch (e) {
						api.plugin.reportError(e)
					}
				}),
			)
		}

		for (const n of FULL_HOSTS) hook(n, true)
		for (const n of OVERLAY_HOSTS) hook(n, false)
	},

	// Unpatching can't remove what Discord already rendered with the pet.
	stop(api) {
		api.plugin.requireReload()
	},
})
