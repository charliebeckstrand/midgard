import { describe, expect, it } from 'vitest'
import { Segment, SegmentControl, SegmentItem } from '../../../components/segment'
import { renderUI, screen, waitFor } from '../../helpers'
import { nextPaint } from '../../helpers/frames'
import { sampleMotionFrames } from '../helpers/motion-frame'

/**
 * The ink of a Segment item steps from the muted rung to the selected rung. The
 * step was immediate, so the label of the new item showed the selected ink
 * while the indicator was still at the old item. The ink must fade while the
 * indicator slides, and the disabled fade must stay.
 */
describe('Segment item ink', () => {
	it('fades to the selected ink while the indicator slides', async () => {
		renderUI(
			<Segment defaultValue="list">
				<SegmentControl aria-label="View">
					<SegmentItem value="list">List</SegmentItem>
					<SegmentItem value="cards">Cards</SegmentItem>
				</SegmentControl>
			</Segment>,
		)

		const list = screen.getByRole('tab', { name: 'List' })

		const cards = screen.getByRole('tab', { name: 'Cards' })

		const transition = getComputedStyle(cards).transitionProperty

		expect(transition).toContain('color')

		expect(transition).toContain('opacity')

		const selected = getComputedStyle(list).color

		const resting = getComputedStyle(cards).color

		expect(resting).not.toBe(selected)

		// Motion completes the mount of the indicator in a microtask after the
		// render, so the press waits for a paint.
		await nextPaint()

		const inks = await sampleMotionFrames(
			() => getComputedStyle(cards).color,
			(ink) => cards.getAttribute('aria-selected') === 'true' && ink !== resting,
			{ during: async () => cards.click() },
		)

		// The first frame after the press shows an ink between the two rungs.
		expect(inks).not.toBe(selected)

		await waitFor(() => expect(getComputedStyle(cards).color).toBe(selected))
	})
})
