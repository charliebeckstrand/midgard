import type { ReactElement } from 'react'
import { describe, expect, it } from 'vitest'
import { Calendar } from '../../../components/calendar'
import { DatePicker } from '../../../components/date-picker'
import { LocaleProvider } from '../../../providers/locale'
import { attach, renderUI } from '../../helpers'
import { serverMarkup } from '../../helpers/hydrate'

/**
 * The server markup of a Calendar and of a DatePicker holds a skeleton of each
 * date label of `Intl`, which waits for hydration. The skeleton holds English
 * text without `Intl`, which in `en-US` is the text of the label. Thus the
 * header, the weekday row, and the trigger keep their boxes when the labels
 * replace the skeletons (CONVENTIONS §3.13).
 */
const START = new Date(2026, 5, 15)

const cases: { name: string; element: ReactElement; selectors: string[] }[] = [
	{
		name: 'Calendar',
		element: <Calendar value={START} />,
		selectors: [
			'[data-slot="calendar"]',
			'[data-slot="calendar-header"] button[data-index="1"]',
			'[aria-hidden="true"]',
		],
	},
	{
		name: 'DatePicker',
		element: <DatePicker aria-label="Due" value={START} />,
		selectors: ['[data-slot="datepicker-button"]'],
	},
	{
		name: 'DatePicker range',
		element: <DatePicker aria-label="Stay" range value={[START, new Date(2026, 5, 20)]} />,
		selectors: ['[data-slot="datepicker-button"]'],
	},
]

/** The width and the height of the first node of each selector in `container`. */
function boxes(container: HTMLElement, selectors: string[]) {
	return selectors.map((selector) => {
		const box = container.querySelector(selector)?.getBoundingClientRect()

		return box ? [Math.round(box.width), Math.round(box.height)] : null
	})
}

describe('skeleton of a date label (real browser)', () => {
	it.each(cases)(
		'$name keeps the boxes of its labels in the server markup',
		({ element, selectors }) => {
			const page = <LocaleProvider locale="en-US">{element}</LocaleProvider>

			const server = attach(serverMarkup(page))

			expect(server.querySelector('[data-slot="placeholder"]')).not.toBeNull()

			const settled = renderUI(page)

			expect(settled.container.querySelector('[data-slot="placeholder"]')).toBeNull()

			const shown = boxes(settled.container, selectors)

			expect(shown).not.toContain(null)

			expect(boxes(server, selectors)).toEqual(shown)
		},
	)
})
