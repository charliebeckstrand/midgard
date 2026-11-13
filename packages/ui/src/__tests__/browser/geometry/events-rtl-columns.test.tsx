import { act } from '@testing-library/react'
import { describe, expect, it, onTestFinished } from 'vitest'
import { halt, start } from '../../../modules/events/engine/events-recorder'
import { recordEvent } from '../../../modules/events/engine/events-sink'
import { EventsPanel } from '../../../modules/events/events-panel'
import { present, renderUI, screen } from '../../helpers'
import { HALF_PIXEL } from '../../helpers/geometry/tolerance'
import { holdDir } from '../helpers/root-state'

/**
 * The columns of the event lines stay in one grid, and the chevron points
 * along the reading direction, in both directions.
 *
 * The columns are padded developer text. In a right-to-left document the
 * bidi algorithm reordered the runs of each line, so the scroll and kind
 * columns moved from row to row. The columns are now left to right, and the
 * chevron mirrors. Placement is a computed-layout claim, so this case uses the
 * real browser.
 */
describe('events line columns (real browser)', () => {
	async function lines(dir: 'ltr' | 'rtl') {
		holdDir(dir)

		start()

		onTestFinished(() => {
			act(() => halt())
		})

		renderUI(<EventsPanel />)

		act(() => {
			recordEvent('route', '/a')

			recordEvent('save', 'save ends', { saves: 2 })

			recordEvent('network', 'chunk.js 12 ms')
		})

		await screen.findByText('/a')

		/** The span of the columns of the line that shows `text`. */
		const findColumns = (text: string) => {
			let node = screen.getByText(text).parentElement

			while (node && !/^\s*\d+ y\d+\s/.test(node.firstElementChild?.textContent ?? ''))
				node = node.parentElement

			return present(node?.firstElementChild, `columns of ${text}`) as HTMLSpanElement
		}

		const columns = ['/a', 'save ends', 'chunk.js 12 ms'].map(findColumns)

		/** The left edge of the `y` of the scroll column of a line. */
		const scrollLeft = (span: HTMLSpanElement) => {
			const text = span.firstChild

			if (!(text instanceof Text)) throw new Error('The columns hold no text.')

			const at = (span.textContent ?? '').indexOf(' y') + 1

			const range = document.createRange()

			range.setStart(text, at)

			range.setEnd(text, at + 1)

			return range.getBoundingClientRect().left
		}

		const trigger = present(
			screen.getByText('save ends').closest('[aria-expanded]'),
			'trigger',
		) as HTMLElement

		const chevron = present(trigger.querySelector('[data-slot="icon"]'), 'chevron')

		const closed = getComputedStyle(chevron).scale

		act(() => trigger.click())

		const slot = present(trigger.firstElementChild, 'chevron slot')

		return { scrolls: columns.map(scrollLeft), closed, open: getComputedStyle(slot).rotate }
	}

	it('keeps the columns in one grid in LTR, with the chevron as drawn', async () => {
		const { scrolls, closed, open } = await lines('ltr')

		expect(scrolls).toHaveLength(3)

		for (const left of scrolls) expect(left).toBeNear(scrolls[0] ?? 0, HALF_PIXEL)

		expect(closed).toBe('none')

		expect(open).toBe('90deg')
	})

	it('keeps the columns in one grid in RTL, and mirrors the chevron', async () => {
		const { scrolls, closed, open } = await lines('rtl')

		expect(scrolls).toHaveLength(3)

		for (const left of scrolls) expect(left).toBeNear(scrolls[0] ?? 0, HALF_PIXEL)

		expect(closed).toMatch(/^-1\b/)

		expect(open).toBe('-90deg')
	})
})
