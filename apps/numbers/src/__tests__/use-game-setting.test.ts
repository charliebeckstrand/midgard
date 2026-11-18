// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { createElement as h, type ReactNode } from 'react'
import { writeCookie } from 'ui/core'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GameSettingsProvider } from '../components/game-settings'
import { useGameSetting } from '../hooks/use-game-setting'
import { type GameSettings, SETTINGS } from '../utilities/settings'

afterEach(() => {
	cleanup()

	for (const { cookie } of Object.values(SETTINGS)) writeCookie(cookie, '', 0)

	window.localStorage.clear()

	vi.restoreAllMocks()
})

/** Renders `useGameSetting(name)` under the settings of a request. */
function renderSetting<Name extends keyof GameSettings>(
	name: Name,
	settings: GameSettings = {
		autoDraw: true,
		showScore: true,
		placementOrder: true,
		difficulty: 'normal',
	},
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

		expect(
			renderSetting('showScore', {
				autoDraw: true,
				showScore: false,
				placementOrder: true,
				difficulty: 'normal',
			}).result.current[0],
		).toBe(false)
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

	it('changes the copy of a write that equals the copy, so the other tabs get the storage event', () => {
		const { cookie } = SETTINGS.autoDraw

		// The cookie expired, and the copy of an older write stays.
		window.localStorage.setItem(cookie, 'off')

		const { result } = renderSetting('autoDraw')

		expect(result.current[0]).toBe(true)

		// A browser fires the `storage` event in the other tabs only when the
		// stored value changes, so the write must change the copy: it removes the
		// copy, and then sets it.
		const remove = vi.spyOn(Storage.prototype, 'removeItem')

		const set = vi.spyOn(Storage.prototype, 'setItem')

		act(() => result.current[1](false))

		expect(remove).toHaveBeenCalledWith(cookie)
		expect(set).toHaveBeenCalledWith(cookie, 'off')
		expect(remove.mock.invocationCallOrder[0]).toBeLessThan(set.mock.invocationCallOrder[0] ?? 0)
		expect(window.localStorage.getItem(cookie)).toBe('off')
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

	it('writes the level of the CPU', () => {
		const { result } = renderSetting('difficulty')

		expect(result.current[0]).toBe('normal')

		act(() => result.current[1]('hard'))

		expect(document.cookie).toContain(`${SETTINGS.difficulty.cookie}=hard`)
		expect(result.current[0]).toBe('hard')
	})

	it('keeps each setting apart', () => {
		const autoDraw = renderSetting('autoDraw')
		const showScore = renderSetting('showScore')

		act(() => showScore.result.current[1](false))

		expect(showScore.result.current[0]).toBe(false)
		expect(autoDraw.result.current[0]).toBe(true)
	})
})
