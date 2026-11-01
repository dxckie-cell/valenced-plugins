import { Stores } from '@valenced/discord/flux'
import { getModules } from '@valenced/modules/finders'
import { withProps } from '@valenced/modules/finders/filters'
import { instead } from '@valenced/patcher'
import SettingsComponent from './settings'
import type { DiscordModules } from '@valenced/discord/types'

export interface Settings {
	enabled: boolean
	/** DD-MM-YYYY */
	date: string
}

export const DEFAULT_DATE = '13-05-2016'

export const DefaultSettings: Settings = {
	enabled: true,
	date: DEFAULT_DATE,
}

/** Parses DD-MM-YYYY (or a previously saved YYYY-MM-DD). Returns null when invalid. */
export function parseDate(value: unknown): Date | null {
	const m =
		typeof value === 'string' &&
		/^(?:(\d{1,2})-(\d{1,2})-(\d{4})|(\d{4})-(\d{2})-(\d{2}))$/.exec(
			value.trim(),
		)
	if (!m) return null

	const [year, month, day] = m[1]
		? [+m[3], +m[2], +m[1]]
		: [+m[4], +m[5], +m[6]]
	// Noon UTC so timezones never roll the day over
	const date = new Date(Date.UTC(year, month - 1, day, 12))

	// Rejects things like 31-02-2020, which Date would roll forward
	return date.getUTCFullYear() === year &&
		date.getUTCMonth() === month - 1 &&
		date.getUTCDate() === day
		? date
		: null
}

export default plugin<{ jsonStorage: Settings }>({
	jsonStorage: { load: true, default: DefaultSettings },
	start({ cleanup, jsonStorage, plugin }) {
		const UserStore = Stores.UserStore as DiscordModules.Flux.Store<{
			getCurrentUser(): { id: string } | undefined
		}>

		// The fake date, but only when `target` (a user or an ID) is you
		const fakeFor = (target: unknown) => {
			const settings = jsonStorage.cache
			if (!settings?.enabled) return null

			const id = typeof target === 'string' ? target : (target as any)?.id
			return id && id === UserStore.getCurrentUser()?.id
				? parseDate(settings.date)
				: null
		}

		// Both helpers are used to build the profile's creation date, depending on
		// the Discord build. Message times use message IDs, so they are untouched.
		cleanup(
			getModules(withProps<any>('getCreatedAtDate'), module =>
				cleanup(
					instead(module, 'getCreatedAtDate', function (args, original) {
						const real = Reflect.apply(original, this, args)

						try {
							const fake = fakeFor(args[0])
							if (!fake) return real
							if (typeof real !== 'string') return fake

							// Preformatted, e.g. "1 Nov 2020"
							return fake.toLocaleDateString(
								typeof args[1] === 'string' ? args[1] : undefined,
								{
									day: 'numeric',
									month: 'short',
									year: 'numeric',
									timeZone: 'UTC',
								},
							)
						} catch (e) {
							plugin.reportError(e)
							return real
						}
					}),
				),
			),
		)

		cleanup(
			getModules(withProps<any>('extractTimestamp'), module =>
				cleanup(
					instead(module, 'extractTimestamp', function (args, original) {
						try {
							const fake = fakeFor(args[0])
							if (fake) return fake.getTime()
						} catch (e) {
							plugin.reportError(e)
						}

						return Reflect.apply(original, this, args)
					}),
				),
			),
		)
	},
	SettingsComponent,
})
