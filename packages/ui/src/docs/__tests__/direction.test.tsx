import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { DirectionListbox, DirectionScript } from '../app/direction.tsx'

// The direction setting of the docs writes `dir` on the root element, and the
// head script writes it again on each load of the tab, before the first paint.
// "System" follows the preferred language of the browser.

/** Takes `dir`, the setting, and the language off after the case, as the window is shared across the files of a worker. */
function resetAfterCase(): void {
	onTestFinished(() => {
		document.documentElement.removeAttribute('dir')

		sessionStorage.clear()

		vi.restoreAllMocks()
	})
}

/** Sets the preferred language of the browser. */
function setLanguage(language: string): void {
	vi.spyOn(navigator, 'language', 'get').mockReturnValue(language)
}

/** Runs the head script, as the browser does before the first paint. */
function runScript(): void {
	const { container, unmount } = render(<DirectionScript />)

	new Function(container.querySelector('script')?.textContent ?? '')()

	unmount()
}

/** Opens the picker and clicks the option with the given name. */
function pick(option: string): void {
	fireEvent.click(screen.getByRole('combobox', { name: 'Direction' }))

	fireEvent.click(screen.getByRole('option', { name: option }))
}

describe('the direction setting of the docs', () => {
	it('lays out the site in the chosen direction, and keeps an override for the tab', () => {
		resetAfterCase()

		setLanguage('en-US')

		render(<DirectionListbox />)

		pick('Right to left')

		expect(document.documentElement.dir).toBe('rtl')

		expect(sessionStorage.getItem('docs:direction')).toBe('rtl')

		pick('Left to right')

		expect(document.documentElement.hasAttribute('dir')).toBe(false)

		expect(sessionStorage.getItem('docs:direction')).toBe('ltr')

		pick('System')

		expect(document.documentElement.hasAttribute('dir')).toBe(false)

		expect(sessionStorage.getItem('docs:direction')).toBeNull()
	})

	it('follows a right-to-left language of the browser on "System", and an override wins', () => {
		resetAfterCase()

		setLanguage('ar-EG')

		render(<DirectionListbox />)

		expect(screen.getByRole('combobox', { name: 'Direction' }).textContent).toContain('System')

		pick('Left to right')

		expect(document.documentElement.hasAttribute('dir')).toBe(false)

		pick('System')

		expect(document.documentElement.dir).toBe('rtl')
	})

	it.each([
		['en-US', null, false],
		['he', null, true],
		['fa-IR', null, true],
		['ar', 'ltr', false],
		['en-US', 'rtl', true],
	])(
		'sets the direction before the first paint (language %s, override %s)',
		(language, override, rtl) => {
			resetAfterCase()

			setLanguage(language)

			if (override) sessionStorage.setItem('docs:direction', override)

			runScript()

			expect(document.documentElement.dir === 'rtl').toBe(rtl)
		},
	)

	it('shows the stored override when the settings open', () => {
		resetAfterCase()

		sessionStorage.setItem('docs:direction', 'rtl')

		render(<DirectionListbox />)

		expect(screen.getByRole('combobox', { name: 'Direction' }).textContent).toContain(
			'Right to left',
		)
	})
})
