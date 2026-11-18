'use client'

import { useEffect, useEffectEvent, useSyncExternalStore } from 'react'
import { readCookie, writeCookie } from 'ui/core'
import { useServerSettings } from '../components/game-settings'
import { formatSetting, type GameSettings, parseSetting, SETTINGS } from '../utilities/settings'

// The cookie holds each setting, and the server and the browser read it. A
// cookie write fires no event, so a write also puts a copy in `localStorage`
// under the name of the cookie. The `storage` event of that copy tells the
// other tabs, as the appearance choices of `ui` do.

/** The listeners of the settings in this tab. */
const listeners = new Set<() => void>()

/** Subscribes to the settings: a write in this tab, and a write in another tab (`storage`). */
function subscribe(listener: () => void): () => void {
	listeners.add(listener)

	window.addEventListener('storage', listener)

	return () => {
		listeners.delete(listener)

		window.removeEventListener('storage', listener)
	}
}

/**
 * The setting of `name`, and its setter. The server render and the hydration
 * have the setting of the cookie of the request ({@link useServerSettings}),
 * and the browser reads the same cookie. A write keeps the setting in the
 * cookie and tells each reader in each tab.
 */
export function useGameSetting<Name extends keyof GameSettings>(
	name: Name,
): [GameSettings[Name], (value: GameSettings[Name]) => void] {
	const server = useServerSettings()[name]

	const { cookie } = SETTINGS[name]

	const value = useSyncExternalStore(
		subscribe,
		() => parseSetting(name, readCookie(cookie)),
		() => server,
	)

	const write = (next: GameSettings[Name]) => {
		const raw = formatSetting(name, next)

		writeCookie(cookie, raw)

		// A storage that refuses the write leaves the other tabs on the old
		// value until their next render. The cookie still holds the setting.
		// A browser fires the `storage` event only when the copy changes, and the
		// copy can hold the same value after the cookie expires. Thus the write
		// removes the copy first, so each write tells the other tabs.
		try {
			window.localStorage.removeItem(cookie)

			window.localStorage.setItem(cookie, raw)
		} catch {}

		for (const listener of listeners) listener()
	}

	return [value, write]
}

/**
 * Calls `onChange` with the new value of the setting `name` at each change while
 * the component is on the screen: a write in this tab, or a write in another
 * tab. Use it for an action that a change starts, such as the draw when
 * Auto-draw comes on.
 *
 * A hidden component, such as a route that Cache Components holds, holds no
 * subscription. A change while it is hidden thus starts no action, and its next
 * render reads the new value. An effect on the value would run again when the
 * route shows, and start the action in a run that the reader left.
 */
export function useGameSettingChange<Name extends keyof GameSettings>(
	name: Name,
	onChange: (value: GameSettings[Name]) => void,
): void {
	const change = useEffectEvent(onChange)

	useEffect(() => {
		const { cookie } = SETTINGS[name]

		const read = () => parseSetting(name, readCookie(cookie))

		let last = read()

		return subscribe(() => {
			const next = read()

			if (next === last) return

			last = next

			change(next)
		})
	}, [name])
}
