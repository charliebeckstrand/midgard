import { describe, expect, it } from 'vitest'
import { Segment, SegmentControl, SegmentItem } from '../../../components/segment'
import { renderUI, screen, waitFor } from '../../helpers'
import { nextPaint } from '../../helpers/frames'
import { sampleMotionFrames } from '../helpers/motion-frame'

/** The inline transform of the active indicator, or `null` while no indicator shows. */
function indicatorTransform(): string | null {
	const indicator = document.querySelector<HTMLElement>('[data-slot="active-indicator"]')

	return indicator ? indicator.style.transform : null
}

/**
 * Real-Motion check of the transform of the active indicator in a morph. The
 * other suites mock `motion/react`, and the mock moves nothing.
 *
 * Motion writes the translate of a morph as `translate3d()`. WebKit gives an
 * element with a 3D transform function a compositing layer of its own, and iOS
 * Safari then painted the indicator above the label of the Segment item for
 * the morph. The indicator must move with a 2D translate in each frame.
 */
describe('active indicator morph (real Motion)', () => {
	it('moves with a 2D translate in each frame, and rests at none', async () => {
		renderUI(
			<Segment defaultValue="overview">
				<SegmentControl aria-label="View">
					<SegmentItem value="overview">Overview</SegmentItem>
					<SegmentItem value="county">By county</SegmentItem>
				</SegmentControl>
			</Segment>,
		)

		const county = screen.getByRole('tab', { name: 'By county' })

		// A reader presses a Segment that has painted. Motion completes the mount
		// of the indicator in a microtask after the render. A press in the task of
		// the render comes before that, and Motion then takes no snapshot of the
		// indicator that leaves, so no morph runs.
		await nextPaint()

		const samples: string[] = []

		// Reads each frame until the indicator has moved and come to rest.
		await sampleMotionFrames(
			() => {
				const transform = indicatorTransform()

				if (transform !== null) samples.push(transform)

				return samples
			},
			(read) => read.some((value) => value.includes('translate')) && read.at(-1) === 'none',
			{ during: async () => county.click() },
		)

		expect(samples.filter((value) => value.includes('translate(')).length).toBeGreaterThan(0)

		expect(samples.filter((value) => value.includes('3d'))).toEqual([])

		await waitFor(() => expect(indicatorTransform()).toBe('none'))
	})
})
