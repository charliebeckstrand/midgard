import type { ReactElement } from 'react'
import { describe, expect, it } from 'vitest'
import { DatePicker } from '../../components/date-picker'
import { LocaleProvider } from '../../providers/locale'
import { attach } from '../helpers'
import { hydrate, OTHER_DATE_MARK, serverMarkup, writeOtherDateText } from '../helpers/hydrate'

const START = new Date(2025, 5, 15)

const END = new Date(2025, 5, 20)

/** `element` in an `en-US` provider, as a page that renders on a server sets it. */
function inEnglish(element: ReactElement) {
	return <LocaleProvider locale="en-US">{element}</LocaleProvider>
}

/** The trigger of the picker in `container`. */
function trigger(container: Element) {
	return container.querySelector('[data-slot="datepicker-button"]')
}

// The text of `Intl` comes from the date data of the JavaScript engine, and the
// engine of a browser can write other text than the engine of the server.
describe('DatePicker hydration when the browser writes other date text', () => {
	it.each<[string, ReactElement, string]>([
		['a date', <DatePicker key="date" aria-label="Due" value={START} />, '6/15/2025'],
		[
			'a range',
			<DatePicker key="range" aria-label="Stay" range value={[START, END]} />,
			'6/15/2025 – 6/20/2025',
		],
		[
			'a custom span',
			<DatePicker key="span" aria-label="Visited" relative value={[{ from: START, to: END }]} />,
			'6/15/2025 – 6/20/2025',
		],
		[
			'a custom span as a summary',
			<DatePicker
				key="summary"
				aria-label="Visited"
				relative={{ chips: false }}
				value={[{ from: START, to: END }]}
			/>,
			'6/15/2025 – 6/20/2025',
		],
	])(
		'puts a skeleton of %s in the server markup, and hydrates it with no mismatch',
		(_, picker, text) => {
			const element = inEnglish(picker)

			const container = attach(serverMarkup(element))

			expect(trigger(container)?.querySelector('[data-slot="placeholder"]')).toHaveTextContent(text)

			writeOtherDateText()

			const { onRecoverableError, consoleError } = hydrate(container, element)

			expect(onRecoverableError).not.toHaveBeenCalled()

			expect(consoleError).not.toHaveBeenCalled()

			expect(trigger(container)?.querySelector('[data-slot="placeholder"]')).toBeNull()

			expect(trigger(container)?.textContent?.replace(/\s/g, ' ')).toContain(
				`${text}${OTHER_DATE_MARK}`.replace(/\s/g, ' '),
			)
		},
	)

	it('writes a pinned format in the server markup, with no skeleton', () => {
		const element = inEnglish(<DatePicker aria-label="Due" format="MM/DD/YYYY" value={START} />)

		const container = attach(serverMarkup(element))

		expect(trigger(container)).toHaveTextContent('06/15/2025')

		expect(trigger(container)?.querySelector('[data-slot="placeholder"]')).toBeNull()
	})
})
