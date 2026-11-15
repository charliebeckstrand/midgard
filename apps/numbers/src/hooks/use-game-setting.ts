'use client'

import { useSyncExternalStore } from 'react'
import { readCookie, writeCookie } from 'ui/core'
import { useServerSettings } from '../components/game-settings'
import { type GameSettings, parseSetting, SETTINGS } from '../utilities/settings'

/** The listeners of the settings in this tab. */
const listeners = new Set<() => void>()

function subscribe(listener: () => void): () => void {
	listeners.add(listener)

	return () => listeners.delete(listener)
}

/**
 * The setting of `name`, and its setter. The server render and the hydration
 * have the setting of the cookie of the request ({@link useServerSettings}),
 * and the browser reads the same cookie. A write keeps the setting in the
 * cookie and tells each reader in the tab.
 */
export function useGameSetting(name: keyof GameSettings): [boolean, (on: boolean) => void] {
	const server = useServerSettings()[name]

	const value = useSyncExternalStore(
		subscribe,
		() => parseSetting(name, readCookie(SETTINGS[name].cookie)),
		() => server,
	)

	const write = (on: boolean) => {
		writeCookie(SETTINGS[name].cookie, on ? 'on' : 'off')

		for (const listener of listeners) listener()
	}

	return [value, write]
}
