import { describe, expect, it } from 'vitest'
import { BubbleChart } from '../../../modules/chart/bubble-chart'
import { renderUI, waitFor } from '../../helpers'
import { sampleMotionFrames } from '../helpers/motion-frame'
import { budget } from '../helpers/wall-clock'

/** Long enough for the mount pop and a size tween to end. */
const SETTLE = { timeout: budget(3000) }

type Stop = { distance: number; dwell: number; weight: number }

const STOPS: Stop[] = [
	{ distance: 12, dwell: 34, weight: 4 },
	{ distance: 48, dwell: 18, weight: 16 },
	{ distance: 30, dwell: 25, weight: 9 },
]

/** The same stops with the largest weight at the first stop. */
const SWAPPED: Stop[] = [
	{ distance: 12, dwell: 34, weight: 16 },
	{ distance: 48, dwell: 18, weight: 4 },
	{ distance: 30, dwell: 25, weight: 9 },
]

function bubbles(width: number, data = STOPS) {
	return (
		<BubbleChart
			aria-label="Dwell against distance, sized by weight"
			data={data}
			width={width}
			series={[{ xKey: 'distance', yKey: 'dwell', sizeKey: 'weight' }]}
			animate
		/>
	)
}

/** The radius of the disc of each stop, in the order of the data. */
function radii(container: HTMLElement): number[] {
	return [...container.querySelectorAll<SVGCircleElement>('[data-slot="chart-scatter-point"]')].map(
		(disc) => Number.parseFloat(disc.getAttribute('r') ?? '0'),
	)
}

/** The rest radius of the largest disc: half of a tenth of the shorter side of the drawing. */
function largestRest(container: HTMLElement): number {
	const svg = container.querySelector('svg[viewBox]')

	const side = Math.min(Number(svg?.getAttribute('width')), Number(svg?.getAttribute('height')))

	return Math.max(28, side / 10) / 2
}

/**
 * Real-Motion check of the bubble radius when the frame resizes. The largest
 * bubble follows the frame, and a resize moves each disc at once. Before the
 * fix, the largest bubble kept 28 px in each frame.
 */
describe('BubbleChart resize', () => {
	it('grows the largest disc with the frame, and applies the new radius at once', async () => {
		const { container, rerender } = renderUI(bubbles(400))

		await waitFor(() => expect(radii(container)[1]).toBe(14), SETTLE)

		const largest: number[] = []

		await sampleMotionFrames(
			() => radii(container)[1] ?? 0,
			(radius) => {
				largest.push(radius)

				return radius > 14
			},
			{ during: async () => rerender(bubbles(1200)) },
		)

		const rest = largestRest(container)

		// A frame of 1200 by 675 px gives a largest disc of 67.5 px across.
		expect(rest).toBeCloseTo(33.75, 1)

		await waitFor(() => expect(radii(container)[1]).toBe(rest), SETTLE)

		// No frame reads a radius between the two rests.
		expect(largest.every((radius) => radius === 14 || radius === rest)).toBe(true)

		expect(largest.at(-1)).toBe(rest)
	})

	it('still grows a disc whose size changes with the data', async () => {
		const { container, rerender } = renderUI(bubbles(400))

		await waitFor(() => expect(radii(container)[1]).toBe(14), SETTLE)

		const before = radii(container)[0] ?? 0

		// The first disc travels from its small rest to 14 px through the frames between.
		const between = await sampleMotionFrames(
			() => radii(container)[0] ?? 0,
			(radius) => radius > before && radius < 14,
			{ during: async () => rerender(bubbles(400, SWAPPED)) },
		)

		expect(between).toBeGreaterThan(before)

		await waitFor(() => expect(radii(container)[0]).toBe(14), SETTLE)
	})
})
