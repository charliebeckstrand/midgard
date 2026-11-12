import { Activity, useState } from 'react'
import { describe, expect, it } from 'vitest'
import { Segment, SegmentControl, SegmentItem } from '../../../components/segment'
import { renderUI, screen, within } from '../../helpers'
import { nextPaint } from '../../helpers/frames'
import { sampleMotionFrames } from '../helpers/motion-frame'

const VIEWS = ['senate', 'governor']

/**
 * A view of each item, each in an `<Activity>`, with a Segment of its own, as
 * the views of an election in the elections app. A pick shows the view of the
 * item and hides the others.
 */
function Views() {
	const [shown, setShown] = useState('governor')

	return VIEWS.map((view) => (
		<Activity key={view} mode={view === shown ? 'visible' : 'hidden'}>
			<section aria-label={view}>
				<Segment value={view} onValueChange={(next) => next !== null && setShown(next)}>
					<SegmentControl aria-label="Office">
						{VIEWS.map((item) => (
							<SegmentItem key={item} value={item}>
								{item}
							</SegmentItem>
						))}
					</SegmentControl>
				</Segment>
				<div style={{ height: 600 }} />
			</section>
		</Activity>
	))
}

/** Picks `item` in the Segment of the visible view `from`. */
function pick(from: string, item: string) {
	within(screen.getByRole('region', { name: from }))
		.getByRole('tab', { name: item })
		.click()
}

/**
 * Real-Motion check of an active indicator that a hidden `<Activity>` shows
 * again. The other suites mock `motion/react`, and the mock moves nothing.
 *
 * Motion measures the indicator when the `<Activity>` hides it, before the
 * commit sets the final layout: the view that becomes visible is still above
 * it in the page. When the view shows again, Motion morphed from that box, and
 * the indicator slid in from below the view.
 */
describe('active indicator in a hidden Activity (real Motion)', () => {
	it('paints at its item at once when the Activity shows it again', async () => {
		renderUI(<Views />)

		await nextPaint()

		// Hides the governor view, then shows it again.
		pick('governor', 'senate')

		await nextPaint()

		const transforms: string[] = []

		await sampleMotionFrames(
			() => {
				const indicator = screen
					.getByRole('region', { name: 'governor', hidden: true })
					.querySelector<HTMLElement>('[data-slot="active-indicator"]')

				transforms.push(indicator?.style.transform ?? '')

				return transforms
			},
			(read) => read.length >= 10,
			{ during: async () => pick('senate', 'governor') },
		)

		expect(transforms.filter((value) => value.includes('translate'))).toEqual([])
	})
})
