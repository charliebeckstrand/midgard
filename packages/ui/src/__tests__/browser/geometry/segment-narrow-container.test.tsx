import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Segment, SegmentControl, SegmentItem } from '../../../components/segment'
import { renderUI, screen, waitFor } from '../../helpers'

/**
 * A Segment with long labels in a container narrower than the labels on one
 * line. The control was `inline-flex` with labels that did not wrap, so it
 * grew past its container and widened a phone page. Then the control was
 * capped at the width of its container, and labels that could not wrap far
 * enough ran past the end of the control.
 */
describe('Segment: container narrower than its labels', () => {
	it('stays inside the container and wraps its labels', () => {
		const { container } = renderUI(
			<div data-testid="box" style={{ width: 300 }}>
				<Segment defaultValue="scheduled">
					<SegmentControl aria-label="Filter">
						<SegmentItem value="all">All</SegmentItem>
						<SegmentItem value="scheduled">Scheduled campaigns</SegmentItem>
						<SegmentItem value="archived">Archived campaigns</SegmentItem>
					</SegmentControl>
				</Segment>
			</div>,
		)

		const box = screen.getByTestId('box').getBoundingClientRect()

		const control = container.querySelector('[role="tablist"]')?.getBoundingClientRect()

		const all = screen.getByRole('tab', { name: 'All' }).getBoundingClientRect()

		const archived = screen.getByRole('tab', { name: 'Archived campaigns' }).getBoundingClientRect()

		expect(control?.right).toBeLessThanOrEqual(box.right)

		// The box holds its items, and a long label wraps instead of a scroll.
		expect(archived.right).toBeLessThanOrEqual(control?.right ?? 0)

		expect(archived.height).toBeGreaterThan(all.height)
	})

	/**
	 * An item does not shrink below its longest word. The box of one-word labels
	 * was capped at the width of the container, so the last item ran past the
	 * end of the box, and a narrower page scrolled sideways.
	 */
	it('scrolls one-word labels that do not fit in their viewport', async () => {
		const { container } = renderUI(
			<div data-testid="box" style={{ width: 200 }}>
				<Segment defaultValue="overview">
					<SegmentControl aria-label="Office">
						<SegmentItem value="overview">Overview</SegmentItem>
						<SegmentItem value="senate">Senate</SegmentItem>
						<SegmentItem value="house">House</SegmentItem>
						<SegmentItem value="governor">Governor</SegmentItem>
					</SegmentControl>
				</Segment>
			</div>,
		)

		const box = screen.getByTestId('box')

		const scroller = container.querySelector<HTMLElement>('[data-slot="tab-list-scroll"]')

		const control = container.querySelector('[role="tablist"]')

		const last = screen.getByRole('tab', { name: 'Governor' })

		// The box holds every item, and the viewport, not the page, takes the overflow.
		expect(last.getBoundingClientRect().right).toBeLessThanOrEqual(
			control?.getBoundingClientRect().right ?? 0,
		)

		expect(box.scrollWidth).toBe(box.clientWidth)

		expect(scroller?.getBoundingClientRect().right).toBeLessThanOrEqual(
			box.getBoundingClientRect().right,
		)

		expect(scroller?.scrollWidth).toBeGreaterThan(scroller?.clientWidth ?? 0)

		// The last item scrolls into view with the end of the box.
		await userEvent.click(last)

		await waitFor(() =>
			expect(scroller?.scrollLeft).toBe(
				(scroller?.scrollWidth ?? 0) - (scroller?.clientWidth ?? 0),
			),
		)
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
