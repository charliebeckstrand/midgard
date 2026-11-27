import { describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { Calendar, CalendarRange } from '../../../components/calendar'
import { present, renderUI } from '../../helpers'
import { eachAuthorScheme, systemColor } from '../helpers/forced-colors'

/**
 * The selected day, today, and a range of days under forced colors. The selected day is a solid
 * blue button and today is a soft blue button, so with no forced colors the fill tells them
 * apart. Forced colors remove each fill. The selected day then takes the `Highlight` pair, as a
 * selected option does. Today keeps the outline of a soft button. In a range, each endpoint takes
 * the `Highlight` pair, and each day between them takes a 2 px `Highlight` outline.
 *
 * Under forced colors, the browser paints a `Canvas` plate behind each line of adjusted text. On
 * a `Highlight` fill, the plate hides a `HighlightText` label, because the two are often one
 * color. Thus the label of the selected day must show on its fill.
 */

/** The current month, a selected day in it, and a range in it that does not hold today. */
function month() {
	const today = new Date()

	const day = (date: number) => new Date(today.getFullYear(), today.getMonth(), date)

	const late = today.getDate() > 15

	return {
		selected: day(late ? 3 : 25),
		range: late ? { start: day(2), end: day(6) } : { start: day(22), end: day(26) },
	}
}

/**
 * The narrowest run of the label across the rows of `element`. Each row of the middle third
 * gives the longest run of pixels that are not the color of the fill. A plate behind the label
 * covers each row of the label from side to side, but each row of a glyph has gaps.
 */
async function narrowestRun(element: HTMLElement): Promise<number> {
	const image = new Image()

	image.src = `data:image/png;base64,${await page.screenshot({ element, save: false })}`

	await image.decode()

	const canvas = document.createElement('canvas')

	const { width, height } = image

	canvas.width = width

	canvas.height = height

	const context = canvas.getContext('2d')

	if (!context) throw new Error('expected a 2D context')

	context.drawImage(image, 0, 0)

	const { data } = context.getImageData(0, 0, width, height)

	const at = (x: number, y: number) => (y * width + x) * 4

	// The middle of the inline-start edge, where the label does not reach, gives the fill.
	const fill = at(3, Math.floor(height / 2))

	// The distance of each channel of the pixel at `i` from the fill, summed.
	const isFill = (i: number) =>
		[0, 1, 2].reduce(
			(sum, channel) => sum + Math.abs((data[i + channel] ?? 0) - (data[fill + channel] ?? 0)),
			0,
		) < 60

	let narrowest = width

	for (let y = Math.floor(height / 3); y < Math.ceil((height * 2) / 3); y++) {
		let longest = 0

		let run = 0

		for (let x = 0; x < width; x++) {
			run = isFill(at(x, y)) ? 0 : run + 1

			longest = Math.max(longest, run)
		}

		narrowest = Math.min(narrowest, longest)
	}

	return narrowest
}

/** The band mark of a day: the outline of its `::after` box. */
function bandMark(day: HTMLElement): string {
	const style = getComputedStyle(day, '::after')

	return `${style.outlineStyle} ${style.outlineWidth} ${style.outlineColor}`
}

function dayStyle(container: HTMLElement, selector: string) {
	return getComputedStyle(
		present(container.querySelector<HTMLElement>(`[role=option]${selector}`), selector),
	)
}

describe('calendar selection under forced colors (real browser)', () => {
	eachAuthorScheme(() => {
		it('paints the selected day in Highlight, and today in another way', () => {
			const { container } = renderUI(<Calendar defaultValue={month().selected} />)

			const selected = dayStyle(container, '[aria-selected=true]')

			const today = dayStyle(container, '[aria-current=date]')

			expect(selected.backgroundColor).toBe(systemColor('Highlight'))

			expect(selected.color).toBe(systemColor('HighlightText'))

			expect(today.backgroundColor).not.toBe(systemColor('Highlight'))

			expect(today.outlineStyle).toBe('solid')
		})

		it('shows the label of the selected day on its Highlight fill', async () => {
			const { container } = renderUI(<Calendar defaultValue={month().selected} />)

			const day = present(
				container.querySelector<HTMLElement>('[role=option][aria-selected=true]'),
				'the selected day',
			)

			// The stroke of a digit is at most 3 px wide, and a plate covers at least the width of a
			// digit, which is 7 px or more.
			expect(await narrowestRun(day)).toBeLessThan(6)
		})

		it('paints the endpoints of a range in Highlight, and outlines each day between them', () => {
			const { range } = month()

			const { container } = renderUI(
				<CalendarRange rangeStart={range.start} rangeEnd={range.end} />,
			)

			const days = [...container.querySelectorAll<HTMLElement>('[role=option][aria-selected=true]')]

			expect(days).toHaveLength(5)

			for (const edge of [days[0], days[4]]) {
				const style = getComputedStyle(present(edge, 'an endpoint'))

				expect(style.backgroundColor).toBe(systemColor('Highlight'))

				expect(style.color).toBe(systemColor('HighlightText'))
			}

			for (const inner of days.slice(1, 4)) {
				expect(getComputedStyle(inner).backgroundColor).not.toBe(systemColor('Highlight'))

				expect(bandMark(inner)).toBe(`solid 2px ${systemColor('Highlight')}`)
			}
		})

		// The active day of the grid takes the ring of a virtual focus. On a day between the
		// endpoints, the day must show the ring and the mark of the band together.
		it('shows the ring of the active day and the mark of the band together', () => {
			const { range } = month()

			const inner = new Date(
				range.start.getFullYear(),
				range.start.getMonth(),
				range.start.getDate() + 2,
			)

			const { container } = renderUI(
				<CalendarRange
					rangeStart={range.start}
					rangeEnd={range.end}
					active={{ zone: 'grid', date: inner }}
				/>,
			)

			const days = [...container.querySelectorAll<HTMLElement>('[role=option][aria-selected=true]')]

			const active = present(days[2], 'the active day')

			const ring = getComputedStyle(active)

			expect(`${ring.outlineStyle} ${ring.outlineOffset} ${ring.outlineColor}`).toBe(
				`solid 2px ${systemColor('CanvasText')}`,
			)

			expect(bandMark(active)).toBe(`solid 2px ${systemColor('Highlight')}`)
		})
	})
})
