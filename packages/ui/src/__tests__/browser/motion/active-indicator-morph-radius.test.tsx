import { describe, expect, it } from 'vitest'
import { Segment, SegmentControl, SegmentItem } from '../../../components/segment'
import { renderUI, screen } from '../../helpers'
import { nextPaint } from '../../helpers/frames'
import { sampleMotionFrames } from '../helpers/motion-frame'

/** The corner radius of the marker as it paints, in px on each axis. */
type Radius = { x: number; y: number }

/**
 * The corner radius that the active indicator paints, or `null` while no
 * indicator shows.
 *
 * Motion writes the radius of a morph as a percent of the box of the marker
 * (`x% / y%`), so that the scale of the morph does not change it. The painted
 * radius is that percent of the box after the transform.
 */
function paintedRadius(): Radius | null {
	const indicator = document.querySelector<HTMLElement>('[data-slot="active-indicator"]')

	if (indicator === null) return null

	const { width, height } = indicator.getBoundingClientRect()

	const [x = '', y = x] = indicator.style.borderTopLeftRadius.split(' ')

	const resolve = (value: string, size: number) =>
		value.endsWith('%') ? (Number.parseFloat(value) / 100) * size : Number.parseFloat(value)

	return { x: resolve(x, width), y: resolve(y, height) }
}

/**
 * Real-Motion check of the corner radius of the active indicator in a morph.
 * The other suites mock `motion/react`, and the mock moves nothing.
 *
 * The marker that mounts takes the snapshot of the marker that it replaces,
 * with the radius of that marker. When the marker lost that snapshot, the
 * morph mixed the radius from zero, and the marker had square corners at the
 * start of each morph.
 */
describe('active indicator morph radius (real Motion)', () => {
	it('keeps the corner radius in each frame of the morph', async () => {
		renderUI(
			<Segment defaultValue="overview">
				<SegmentControl aria-label="View">
					<SegmentItem value="overview">Overview</SegmentItem>
					<SegmentItem value="county">By county with a long label</SegmentItem>
				</SegmentControl>
			</Segment>,
		)

		const county = screen.getByRole('tab', { name: 'By county with a long label' })

		// Motion completes the mount of the indicator in a microtask after the
		// render. A press before that takes no snapshot, so no morph runs.
		await nextPaint()

		const samples: { radius: Radius; transform: string }[] = []

		await sampleMotionFrames(
			() => {
				const radius = paintedRadius()

				const indicator = document.querySelector<HTMLElement>('[data-slot="active-indicator"]')

				if (radius !== null && indicator !== null) {
					samples.push({ radius, transform: indicator.style.transform })
				}

				return samples
			},
			(read) =>
				read.some(({ transform }) => transform.includes('translate')) &&
				read.at(-1)?.transform === 'none',
			{ during: async () => county.click() },
		)

		const morph = samples.filter(({ transform }) => transform.includes('translate'))

		expect(morph.length).toBeGreaterThan(0)

		for (const { radius } of morph) {
			expect(radius.x).toBeCloseTo(8, 0)

			expect(radius.y).toBeCloseTo(8, 0)
		}
	})
})
