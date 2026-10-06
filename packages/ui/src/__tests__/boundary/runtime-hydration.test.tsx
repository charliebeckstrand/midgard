import type { ReactElement } from 'react'
import { hydrateRoot, type Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, onTestFinished, vi } from 'vitest'

import { Calendar } from '../../components/calendar'
import { CurrencyInput } from '../../components/currency-input'
import { LocaleProvider } from '../../providers/locale'
import { resolveLocale } from '../../utilities'
import { act, attach, screen } from '../helpers'

/**
 * Server markup that the client hydrates in a different runtime. The server and
 * the browser can have a different default locale and a different time zone,
 * and the library reads the runtime of the side that renders. A page that
 * renders on a server must set `locale` or a `LocaleProvider`. It must also
 * build each seed date from local parts. These cases pin that limit: with those
 * settings, the server markup and the hydration render agree.
 *
 * A worker thread keeps the zone that it started with, so a change of `TZ`
 * needs a fork. The suite also replaces `resolveLocale` with a module mock. So
 * it sits in `boundary/`, which the `integration` project runs on forks.
 */

// A page reads the runtime locale once in each process, and the server and the
// browser are two processes. This suite renders the two sides in one process,
// so the double reads the runtime locale at each call.
vi.mock('../../utilities/resolve-locale', () => ({
	resolveLocale: (locale?: string) => locale ?? new Intl.DateTimeFormat().resolvedOptions().locale,
}))

/**
 * The runtime locale of the client. It differs from `en-US` in the first day of
 * the week, in each label, and in the place of the currency symbol.
 */
const CLIENT_LOCALE = 'de-DE'

/**
 * Renders `element()` to server markup. Then `toClient` moves the process to the
 * runtime of the client, and the markup hydrates with a new `element()`. Each
 * side builds its own element, as a page does, so a seed date reads the zone of
 * its side.
 *
 * @returns Two spies. A text or a node mismatch reaches `onRecoverableError`,
 * and React logs an attribute mismatch to `consoleError`.
 */
function hydrateAcrossRuntimes(element: () => ReactElement, toClient: () => void) {
	const container = attach(document.createElement('div'))

	container.innerHTML = renderToString(element())

	toClient()

	const onRecoverableError = vi.fn()

	const consoleError = vi.spyOn(console, 'error')

	let root: Root | undefined

	act(() => {
		root = hydrateRoot(container, element(), { onRecoverableError })
	})

	onTestFinished(() => act(() => root?.unmount()))

	return { onRecoverableError, consoleError }
}

/** Gives the `Intl` date and number formatters the client locale as the default until the case ends. */
function toClientLocale(): void {
	const { DateTimeFormat, NumberFormat } = Intl

	class ClientDateTimeFormat extends DateTimeFormat {
		constructor(locales?: Intl.LocalesArgument, options?: Intl.DateTimeFormatOptions) {
			super(locales ?? CLIENT_LOCALE, options)
		}
	}

	class ClientNumberFormat extends NumberFormat {
		constructor(locales?: Intl.LocalesArgument, options?: Intl.NumberFormatOptions) {
			super(locales ?? CLIENT_LOCALE, options)
		}
	}

	Intl.DateTimeFormat = ClientDateTimeFormat as typeof Intl.DateTimeFormat

	Intl.NumberFormat = ClientNumberFormat as typeof Intl.NumberFormat

	onTestFinished(() => {
		Intl.DateTimeFormat = DateTimeFormat

		Intl.NumberFormat = NumberFormat
	})

	// A case that keeps the locale of the server passes with no setting, so it
	// must fail here.
	expect(resolveLocale(), 'the runtime locale did not change').toBe(CLIENT_LOCALE)
}

/** Moves the process from UTC to Los Angeles until the case ends. */
function toLosAngeles(): void {
	const zone = process.env.TZ

	process.env.TZ = 'America/Los_Angeles'

	onTestFinished(() => {
		process.env.TZ = zone
	})

	// A case that stays in UTC passes on any seed, so it must fail here.
	expect(new Date(2026, 0, 1).getTimezoneOffset(), 'the zone change took no effect').toBe(480)
}

describe('server markup across a runtime-locale difference', () => {
	it.each([
		['a `locale`', () => <Calendar locale="en-US" value={new Date(2025, 6, 1)} />],
		[
			'a `LocaleProvider`',
			() => (
				<LocaleProvider locale="en-US">
					<Calendar value={new Date(2025, 6, 1)} />
				</LocaleProvider>
			),
		],
	])('hydrates a calendar in %s with no mismatch', (_, element) => {
		const { onRecoverableError, consoleError } = hydrateAcrossRuntimes(element, toClientLocale)

		expect(onRecoverableError).not.toHaveBeenCalled()

		expect(consoleError).not.toHaveBeenCalled()

		expect(screen.getByRole('listbox', { name: 'July 2025' })).toBeInTheDocument()

		expect(screen.getByRole('option', { selected: true })).toHaveAccessibleName(
			'Tuesday, July 1, 2025',
		)
	})

	it.each([
		['a `locale`', () => <CurrencyInput aria-label="Price" locale="en-US" value={1234.5} />],
		[
			'a `LocaleProvider`',
			() => (
				<LocaleProvider locale="en-US">
					<CurrencyInput aria-label="Price" value={1234.5} />
				</LocaleProvider>
			),
		],
	])('hydrates a currency field in %s with no mismatch', (_, element) => {
		const { onRecoverableError, consoleError } = hydrateAcrossRuntimes(element, toClientLocale)

		expect(onRecoverableError).not.toHaveBeenCalled()

		expect(consoleError).not.toHaveBeenCalled()

		expect(screen.getByRole('textbox', { name: 'Price' })).toHaveValue('1,234.50')

		expect(screen.getByRole('textbox', { name: 'Price' })).toHaveAccessibleDescription('$')
	})
})

describe('calendar server markup across a zone difference', () => {
	it.each([
		['value', () => <Calendar value={new Date(2025, 6, 1)} />],
		['defaultValue', () => <Calendar defaultValue={new Date(2025, 6, 1)} />],
	])('hydrates a %s from local parts on the first of the month with no mismatch', (_, element) => {
		const { onRecoverableError, consoleError } = hydrateAcrossRuntimes(element, toLosAngeles)

		expect(onRecoverableError).not.toHaveBeenCalled()

		expect(consoleError).not.toHaveBeenCalled()

		expect(screen.getByRole('listbox', { name: 'July 2025' })).toBeInTheDocument()

		expect(screen.getAllByRole('option')).toHaveLength(31)

		expect(screen.getByRole('option', { selected: true })).toHaveAccessibleName(
			'Tuesday, July 1, 2025',
		)
	})
})
