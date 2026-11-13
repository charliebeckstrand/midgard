import { describe, expect, it } from 'vitest'
import { BubbleChart } from '../../../modules/chart/bubble-chart'
import { renderUI, waitFor } from '../../helpers'
import { sampleMotionFrames } from '../helpers/motion-frame'
import { budget } from '../helpers/wall-clock'

/** Long enough for the mount pop to end. */
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

function bubbles(width: number, data = STOPS, chrome = false) {
	return (
		<BubbleChart
			aria-label="Dwell against distance, sized by weight"
			title={chrome ? 'Stops' : undefined}
			subtitle={chrome ? 'Dwell against distance' : undefined}
			legend={chrome}
			data={data}
			width={width}
			series={[{ xKey: 'distance', yKey: 'dwell', sizeKey: 'weight', yName: 'Dwell' }]}
			animate
		/>
	)
}

/**
 * The drawn radius of the disc of each stop, in the order of the data. It reads
 * the box of the disc, so it holds the radius and the scale of the pop.
 */
function drawn(container: HTMLElement): number[] {
	return [...container.querySelectorAll<SVGCircleElement>('[data-slot="chart-scatter-point"]')].map(
		(disc) => disc.getBoundingClientRect().width / 2,
	)
}

/** The rest radius of the largest disc: half of a tenth of the shorter side of the drawing. */
function largestRest(container: HTMLElement): number {
	const svg = container.querySelector('svg[viewBox]')

	const side = Math.min(Number(svg?.getAttribute('width')), Number(svg?.getAttribute('height')))

	return Math.max(28, side / 10) / 2
}

/** Waits until the disc of `stop` rests at `radius`. */
async function rests(container: HTMLElement, stop: number, radius: number): Promise<void> {
	await waitFor(() => expect(drawn(container)[stop]).toBeCloseTo(radius, 2), SETTLE)
}

/**
 * Real-Motion check of the bubble radius. The largest bubble follows the frame.
 * The radius is geometry, as the center is, so it lands at once. The pop rides
 * the scale of the disc. Before the fix, the largest bubble kept 28 px in each
 * frame.
 */
describe('BubbleChart radius', () => {
	it('grows the largest disc with the frame, and lands the new radius at once', async () => {
		const { container, rerender } = renderUI(bubbles(400))

		await rests(container, 1, 14)

		const largest: number[] = []

		await sampleMotionFrames(
			() => drawn(container)[1] ?? 0,
			(radius) => {
				largest.push(radius)

				return radius > 14.01
			},
			{ during: async () => rerender(bubbles(1200)) },
		)

		const rest = largestRest(container)

		// A frame of 1200 by 675 px gives a largest disc of 67.5 px across.
		expect(rest).toBeCloseTo(33.75, 1)

		// No frame draws a radius between the two rests.
		expect(largest.at(-1)).toBeCloseTo(rest, 2)

		expect(largest.every((radius) => Math.abs(radius - 14) < 0.01 || radius > rest - 0.01)).toBe(
			true,
		)
	})

	it('lands a size that changes with the data at once, as the move', async () => {
		const { container, rerender } = renderUI(bubbles(400))

		await rests(container, 1, 14)

		const before = drawn(container)[0] ?? 0

		const first: number[] = []

		await sampleMotionFrames(
			() => drawn(container)[0] ?? 0,
			(radius) => {
				first.push(radius)

				return radius > before + 0.01
			},
			{ during: async () => rerender(bubbles(400, SWAPPED)) },
		)

		expect(first.at(-1)).toBeCloseTo(14, 2)

		expect(first.every((radius) => radius < before + 0.01 || radius > 13.99)).toBe(true)
	})

	it('pops each disc on mount when the frame settles its height before the paint', async () => {
		let container: HTMLElement | undefined

		// The title, the subtitle, and the legend take height from the box. With an
		// explicit width, the first render draws the full `width / ratio` height,
		// and the measured height replaces it before the paint. The ceiling of the
		// frame thus changes before the pop starts.
		const growing = await sampleMotionFrames(
			() => (container ? drawn(container)[1] : undefined) ?? 0,
			(radius) => radius > 1 && radius < 14,
			{
				during: async () => {
					container = renderUI(bubbles(900, STOPS, true)).container
				},
			},
		)

		expect(growing).toBeGreaterThan(1)

		if (container) await rests(container, 1, largestRest(container))
	})
})
