import { describe, expect, it } from 'vitest'
import { PieChart } from '../../../modules/chart/pie-chart'
import { REDUCED_MOTION_QUERY } from '../../../utilities/media-query'
import { renderUI, stubMatchMedia, waitFor } from '../../helpers'
import { legendItem } from '../../helpers/chart-legend'
import { nextPaint } from '../../helpers/frames'
import { sampleMotionFrames } from '../helpers/motion-frame'
import { budget } from '../helpers/wall-clock'

/** Long enough for the mount sweep, the label fades, and the morph to end. */
const SETTLE = { timeout: budget(3000) }

const DATA = [
	{ source: 'Search', visits: 40 },
	{ source: 'Direct', visits: 30 },
	{ source: 'Referral', visits: 20 },
	{ source: 'Social', visits: 10 },
]

function pie(labels = false) {
	return (
		<PieChart
			aria-label="Traffic by source"
			data={DATA}
			series={[{ xKey: 'source', yKey: 'visits' }]}
			width={320}
			labels={{ segment: labels }}
			animate
		/>
	)
}

/** The `d` of each drawn slice, in draw order. */
function slices(container: HTMLElement): string[] {
	return [...container.querySelectorAll('[data-slot="chart-slice"]')].map(
		(slice) => slice.getAttribute('d') ?? '',
	)
}

/**
 * Real-Motion check of the pie's legend toggle. The other suites mock
 * `motion/react`, and the mock runs no tween.
 *
 * A legend toggle re-shares the slices. Before the fix the slices took their
 * new angles in one frame, also on an animated pie. Now they turn to them: a
 * hidden slice shrinks to nothing where it stands, and the rest grow to close
 * the gap.
 */
describe('pie legend toggle (real Motion)', () => {
	it('turns the slices to their new angles', async () => {
		const { container } = renderUI(pie())

		await waitFor(() => expect(slices(container)).toHaveLength(4))

		const before = slices(container)

		const item = legendItem(container, 'Direct')

		// A frame between the two layouts: the leaving slice still draws, at a new size.
		const between = await sampleMotionFrames(
			() => slices(container),
			(drawn) => drawn.length === 4 && drawn[1] !== before[1],
			{ during: async () => item.click() },
		)

		expect(between[0]).not.toBe(before[0])

		await waitFor(() => expect(slices(container)).toHaveLength(3), SETTLE)

		// The morph lands on the slices that a static pie draws for the same toggle.
		const { container: still } = renderUI(
			<PieChart
				aria-label="Traffic by source"
				data={DATA}
				series={[{ xKey: 'source', yKey: 'visits' }]}
				width={320}
			/>,
		)

		legendItem(still, 'Direct').click()

		await waitFor(() => expect(slices(still)).toHaveLength(3))

		expect(slices(container)).toEqual(slices(still))
	})

	it('shrinks the last slice to nothing, and grows it back, as a wedge', async () => {
		const { container } = renderUI(pie())

		await waitFor(() => expect(slices(container)).toHaveLength(4))

		for (const name of ['Search', 'Direct', 'Referral']) legendItem(container, name).click()

		await waitFor(() => expect(slices(container)).toHaveLength(1), SETTLE)

		// The lone slice at rest is the full disc.
		const [disc] = slices(container)

		const last = legendItem(container, 'Social')

		// A frame of the morph draws a wedge, not the disc.
		const leaving = await sampleMotionFrames(
			() => slices(container),
			(drawn) => drawn.length === 1 && drawn[0] !== disc,
			{ during: async () => last.click() },
		)

		expect(leaving).toHaveLength(1)

		await waitFor(() => expect(slices(container)).toHaveLength(0), SETTLE)

		const coming = await sampleMotionFrames(
			() => slices(container),
			(drawn) => drawn.length === 1 && drawn[0] !== disc,
			{ during: async () => last.click() },
		)

		expect(coming).toHaveLength(1)

		await waitFor(() => expect(slices(container)).toEqual([disc]), SETTLE)
	})

	it('fades the segment labels in again at their new places', async () => {
		const { container } = renderUI(pie(true))

		const labels = () =>
			[...container.querySelectorAll<SVGTextElement>('[data-slot="chart-segment-label"]')].map(
				(label) => Number.parseFloat(getComputedStyle(label).opacity),
			)

		await waitFor(() => expect(labels().every((opacity) => opacity === 1)).toBe(true), SETTLE)

		legendItem(container, 'Direct').click()

		// The labels wait for the slices: none shows while the morph runs.
		await nextPaint()

		expect(labels().every((opacity) => opacity < 1)).toBe(true)

		await waitFor(() => {
			expect(labels().length).toBeGreaterThan(0)

			expect(labels().every((opacity) => opacity === 1)).toBe(true)
		}, SETTLE)
	})

	it('snaps to the new angles under reduced motion', async () => {
		stubMatchMedia((query) => query === REDUCED_MOTION_QUERY)

		const { container } = renderUI(pie())

		await waitFor(() => expect(slices(container)).toHaveLength(4))

		legendItem(container, 'Direct').click()

		await nextPaint()

		expect(slices(container)).toHaveLength(3)
	})
})
