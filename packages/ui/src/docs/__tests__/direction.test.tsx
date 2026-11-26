import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import { DirectionListbox } from '../app/direction.tsx'
import { LOCALES } from '../app/language.ts'

// The direction setting of the docs writes `dir` on the root element. "System"
// takes it off, so the page has the direction of its language. The choice is
// not stored, so a reload starts at "System".

/** The text info of an `Intl.Locale`, as far as the cases read it. */
type TextInfo = { direction: 'ltr' | 'rtl' }

/** Takes `dir` off after the case, as the window is shared across the files of a worker. */
function resetAfterCase(): void {
	onTestFinished(() => {
		document.documentElement.removeAttribute('dir')
	})
}

/** Opens the picker and clicks the option with the given name. */
function pick(option: string): void {
	fireEvent.click(screen.getByRole('combobox', { name: 'Direction' }))

	fireEvent.click(screen.getByRole('option', { name: option }))
}

/** The text of the picker. */
function shown(): string {
	return screen.getByRole('combobox', { name: 'Direction' }).textContent ?? ''
}

describe('the direction setting of the docs', () => {
	beforeEach(resetAfterCase)

	it('lays out the site in the chosen direction, and "System" takes the direction off', () => {
		render(<DirectionListbox />)

		expect(shown()).toContain('System')

		pick('Right to left')

		expect(document.documentElement.dir).toBe('rtl')

		pick('Left to right')

		expect(document.documentElement.dir).toBe('ltr')

		pick('System')

		expect(document.documentElement).not.toHaveAttribute('dir')
	})

	it('stores no choice, so a reload starts at "System"', () => {
		const setItem = vi.spyOn(Storage.prototype, 'setItem')

		render(<DirectionListbox />)

		pick('Right to left')

		expect(setItem).not.toHaveBeenCalled()
	})

	it.each([
		['rtl', 'Right to left'],
		['ltr', 'Left to right'],
	])('shows the choice of the root element (%s) when the settings open again', (dir, option) => {
		document.documentElement.dir = dir

		render(<DirectionListbox />)

		expect(shown()).toContain(option)
	})

	// "System" sets no `dir`, so it is left to right only while each language of
	// the docs is left to right. A right-to-left language needs a direction
	// from its locale.
	it.each(LOCALES)('has a left-to-right language for each locale (%s)', (locale) => {
		// The text info of a locale gives its direction. Node 26 (V8 14.6) has the
		// `getTextInfo()` method and no `textInfo` accessor. Node 22 and Node 24
		// have only the accessor. The test reads the form that the runtime has, so
		// the result does not change with the version of Node. Neither form is in
		// the ES2023 types of the `lib` of the tsconfig.
		const intlLocale = new Intl.Locale(locale) as Intl.Locale & {
			getTextInfo?: () => TextInfo
			textInfo?: TextInfo
		}

		const textInfo = intlLocale.getTextInfo?.() ?? intlLocale.textInfo

		expect(textInfo?.direction).toBe('ltr')
	})
})
