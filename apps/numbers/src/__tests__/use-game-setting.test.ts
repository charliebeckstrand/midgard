// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { createElement as h, type ReactNode } from 'react'
import { writeCookie } from 'ui/core'
import { afterEach, describe, expect, it } from 'vitest'
import { GameSettingsProvider } from '../components/game-settings'
import { useGameSetting } from '../hooks/use-game-setting'
import { type GameSettings, SETTINGS } from '../utilities/settings'

afterEach(() => {
	cleanup()

	for (const { cookie } of Object.values(SETTINGS)) writeCookie(cookie, '', 0)

	window.localStorage.clear()
})

/** Renders `useGameSetting(name)` under the settings of a request. */
function renderSetting(
	name: keyof GameSettings,
	settings: GameSettings = { autoDraw: true, showScore: true },
) {
	const wrapper = ({ children }: { children: ReactNode }) =>
		h(GameSettingsProvider, { settings, children })

	return renderHook(() => useGameSetting(name), { wrapper })
}

describe('useGameSetting', () => {
	it('gives the default with no cookie', () => {
		expect(renderSetting('autoDraw').result.current[0]).toBe(true)
		expect(renderSetting('showScore').result.current[0]).toBe(true)
	})

	it('reads the cookie', () => {
		writeCookie(SETTINGS.showScore.cookie, 'off')

		expect(renderSetting('showScore', { autoDraw: true, showScore: false }).result.current[0]).toBe(
			false,
		)
	})

	it('writes the cookie, and tells each reader in the tab', () => {
		const first = renderSetting('autoDraw')
		const second = renderSetting('autoDraw')

		act(() => first.result.current[1](false))

		expect(document.cookie).toContain(`${SETTINGS.autoDraw.cookie}=off`)
		expect(first.result.current[0]).toBe(false)
		expect(second.result.current[0]).toBe(false)

		act(() => second.result.current[1](true))

		expect(document.cookie).toContain(`${SETTINGS.autoDraw.cookie}=on`)
		expect(first.result.current[0]).toBe(true)
	})

	it('follows a write in another tab', () => {
		const { result } = renderSetting('autoDraw')

		// Another tab writes the shared cookie and the copy in its storage, and
		// this tab gets the `storage` event of the copy.
		act(() => {
			writeCookie(SETTINGS.autoDraw.cookie, 'off')

			window.dispatchEvent(
				new StorageEvent('storage', { key: SETTINGS.autoDraw.cookie, newValue: 'off' }),
			)
		})

		expect(result.current[0]).toBe(false)
	})

	it('puts a copy of a write in the storage, for the other tabs', () => {
		const { result } = renderSetting('showScore')

		act(() => result.current[1](false))

		expect(window.localStorage.getItem(SETTINGS.showScore.cookie)).toBe('off')
	})

	it('keeps each setting apart', () => {
		const autoDraw = renderSetting('autoDraw')
		const showScore = renderSetting('showScore')

		act(() => showScore.result.current[1](false))

		expect(showScore.result.current[0]).toBe(false)
		expect(autoDraw.result.current[0]).toBe(true)
	})
})
