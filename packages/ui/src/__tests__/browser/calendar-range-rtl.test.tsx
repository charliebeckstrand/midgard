import { describe, expect, it } from 'vitest'
import { CalendarRange } from '../../components/calendar/calendar-range'
import { present, renderUI, screen } from '../helpers'

function d(year: number, month: number, day: number) {
	return new Date(year, month - 1, day)
}

function findDay(day: number) {
	return present(
		screen.getAllByRole('option').find((cell) => cell.textContent?.trim() === String(day)),
		`the cell of day ${day}`,
	)
}

/** The two corner radii on one physical side of a cell. */
function corners(el: HTMLElement, side: 'left' | 'right') {
	const style = getComputedStyle(el)

	return side === 'left'
		? [style.borderTopLeftRadius, style.borderBottomLeftRadius]
		: [style.borderTopRightRadius, style.borderBottomRightRadius]
}

/**
 * Each endpoint of a range squares the corners that face the band, so the band
 * runs flat into the endpoint. The day grid follows the inline direction. In a
 * right-to-left region the band runs from right to left, so the squared corners
 * must mirror with it. jsdom resolves no `dir`, so the case runs here.
 */
describe('calendar range edges in right-to-left (real browser)', () => {
	for (const dir of ['ltr', 'rtl'] as const) {
		it(`squares the band-side corners of each endpoint (${dir})`, () => {
			renderUI(
				<div dir={dir}>
					<CalendarRange rangeStart={d(2024, 3, 4)} rangeEnd={d(2024, 3, 7)} />
				</div>,
			)

			const inlineStart = dir === 'ltr' ? 'left' : 'right'

			const inlineEnd = dir === 'ltr' ? 'right' : 'left'

			const start = findDay(4)

			const end = findDay(7)

			expect(corners(start, inlineEnd)).toEqual(['0px', '0px'])

			expect(corners(end, inlineStart)).toEqual(['0px', '0px'])

			for (const radius of [...corners(start, inlineStart), ...corners(end, inlineEnd)]) {
				expect(Number.parseFloat(radius)).toBeGreaterThan(0)
			}
		})
	}
})
