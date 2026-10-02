import { describe, expect, it } from 'vitest'
import { Segment, SegmentControl, SegmentItem } from '../../../components/segment'
import { renderUI } from '../../helpers'

/**
 * A Segment with long labels in a container narrower than the labels on one
 * line. The control was `inline-flex` with labels that did not wrap, so it
 * grew past its container and widened a phone page.
 */
describe('Segment: container narrower than its labels', () => {
	it('stays inside the container and wraps its labels', () => {
		const { container } = renderUI(
			<div data-testid="box" style={{ width: 220 }}>
				<Segment defaultValue="scheduled">
					<SegmentControl aria-label="Filter">
						<SegmentItem value="all">All</SegmentItem>
						<SegmentItem value="scheduled">Scheduled campaigns</SegmentItem>
						<SegmentItem value="archived">Archived campaigns</SegmentItem>
					</SegmentControl>
				</Segment>
			</div>,
		)

		const box = container.querySelector('[data-testid="box"]')?.getBoundingClientRect()

		const control = container.querySelector('[role="tablist"]')?.getBoundingClientRect()

		expect(control?.right).toBeLessThanOrEqual(box?.right ?? 0)
	})

	it('keeps short labels on one line', () => {
		const { container } = renderUI(
			<Segment defaultValue="list">
				<SegmentControl aria-label="View">
					<SegmentItem value="list">List view</SegmentItem>
					<SegmentItem value="card">Card view</SegmentItem>
				</SegmentControl>
			</Segment>,
		)

		const [first, second] = [...container.querySelectorAll('[role="tab"]')].map((tab) =>
			tab.getBoundingClientRect(),
		)

		expect(first?.height).toBe(second?.height)

		expect(first?.height).toBeLessThan(40)
	})
})
