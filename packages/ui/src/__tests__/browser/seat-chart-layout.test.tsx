import { describe, expect, it } from 'vitest'
import { SeatChart } from '../../modules/chart/seat-chart'
import { present, renderUI } from '../helpers'

/**
 * The hemicycle draws inside the plot at the real layout, at a fluid width and
 * a fluid height, and the content of the hole sits on its base, between the
 * two ends of the inner arc.
 */
describe('SeatChart layout (real browser)', () => {
	it.each([320, 640])(
		'keeps the seats in the plot and the content in the hole at %i px',
		(width) => {
			const { container } = renderUI(
				<div style={{ width }}>
					<SeatChart
						aria-label="House seats"
						groups={[
							{ seats: 214, color: 'blue', label: 'Democrats' },
							{ seats: 18, color: 'zinc', label: 'Not called', hollow: true },
							{ seats: 203, color: 'red', label: 'Republicans' },
						]}
						majority={218}
					>
						<span data-testid="hole">218</span>
					</SeatChart>
				</div>,
			)

			const plot = present(
				container.querySelector<HTMLElement>('[data-slot="chart-plot"]'),
				'the plot',
			).getBoundingClientRect()

			const seats = present(
				container.querySelector<SVGGElement>('[data-slot="chart-seats"]'),
				'the seats',
			).getBoundingClientRect()

			const hole = present(
				container.querySelector<HTMLElement>('[data-testid="hole"]'),
				'the hole content',
			).getBoundingClientRect()

			expect(seats.width).toBeGreaterThan(0)

			expect(seats.left).toBeGreaterThanOrEqual(plot.left - 0.5)

			expect(seats.right).toBeLessThanOrEqual(plot.right + 0.5)

			expect(seats.top).toBeGreaterThanOrEqual(plot.top - 0.5)

			expect(seats.bottom).toBeLessThanOrEqual(plot.bottom + 0.5)

			// The content stands on the base of the hemicycle, centered on it.
			const center = (seats.left + seats.right) / 2

			expect(Math.abs((hole.left + hole.right) / 2 - center)).toBeLessThan(1.5)

			expect(hole.bottom).toBeLessThanOrEqual(seats.bottom)

			expect(hole.bottom).toBeGreaterThan(seats.bottom - seats.height * 0.2)
		},
	)

	it.each([320, 640])(
		'keeps the majority label in the plot, over the marker and off the seats, at %i px',
		(width) => {
			const { container } = renderUI(
				<div style={{ width }}>
					<SeatChart
						aria-label="House seats"
						groups={[
							{ seats: 214, color: 'blue', label: 'Democrats' },
							{ seats: 18, color: 'zinc', label: 'Not called', hollow: true },
							{ seats: 203, color: 'red', label: 'Republicans' },
						]}
						majority={218}
						majorityLabel
					/>
				</div>,
			)

			const plot = present(
				container.querySelector<HTMLElement>('[data-slot="chart-plot"]'),
				'the plot',
			).getBoundingClientRect()

			const seats = present(
				container.querySelector<SVGGElement>('[data-slot="chart-seats"]'),
				'the seats',
			).getBoundingClientRect()

			const marker = present(
				container.querySelector<SVGPolygonElement>('[data-slot="chart-majority-marker"]'),
				'the marker',
			).getBoundingClientRect()

			const label = present(
				container.querySelector<SVGTextElement>('[data-slot="chart-majority-label"]'),
				'the label',
			)

			const box = label.getBoundingClientRect()

			expect(label.textContent).toBe('218 to win')

			// The label stands centered over the marker.
			expect(Math.abs((box.left + box.right) / 2 - (marker.left + marker.right) / 2)).toBeLessThan(
				1,
			)

			expect(box.bottom).toBeLessThanOrEqual(marker.top + 0.5)

			expect(box.left).toBeGreaterThanOrEqual(plot.left - 0.5)

			expect(box.right).toBeLessThanOrEqual(plot.right + 0.5)

			// The glyph box is taller than the ink, so it may reach a little past the top.
			expect(box.top).toBeGreaterThanOrEqual(plot.top - 3)

			expect(box.bottom).toBeLessThanOrEqual(seats.top)
		},
	)
})
