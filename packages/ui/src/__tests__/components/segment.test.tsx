import { describe, expect, it, vi } from 'vitest'
import { Segment, SegmentControl, SegmentItem } from '../../components/segment'
import { allBySlot, bySlot, renderUI } from '../helpers'

describe('Segment', () => {
	it('renders with data-slot="segment-control"', () => {
		const { container } = renderUI(
			<Segment value="a">
				<SegmentControl>
					<SegmentItem value="a">A</SegmentItem>
					<SegmentItem value="b">B</SegmentItem>
				</SegmentControl>
			</Segment>,
		)

		expect(bySlot(container, 'segment-control')).toBeInTheDocument()
	})

	it('renders segment items with role="radio"', () => {
		const { container } = renderUI(
			<Segment value="a">
				<SegmentControl>
					<SegmentItem value="a">A</SegmentItem>
					<SegmentItem value="b">B</SegmentItem>
				</SegmentControl>
			</Segment>,
		)

		const items = allBySlot(container, 'segment-item')

		expect(items).toHaveLength(2)

		expect(items[0]).toHaveAttribute('role', 'radio')
		expect(items[1]).toHaveAttribute('role', 'radio')
	})

	it('marks the selected segment item as aria-checked', () => {
		const { container } = renderUI(
			<Segment value="b">
				<SegmentControl>
					<SegmentItem value="a">A</SegmentItem>
					<SegmentItem value="b">B</SegmentItem>
				</SegmentControl>
			</Segment>,
		)

		const items = allBySlot(container, 'segment-item')

		expect(items[0]).toHaveAttribute('aria-checked', 'false')
		expect(items[1]).toHaveAttribute('aria-checked', 'true')
	})

	it('calls onValueChange when a segment item is clicked', () => {
		const onValueChange = vi.fn()

		const { container } = renderUI(
			<Segment value="a" onValueChange={onValueChange}>
				<SegmentControl>
					<SegmentItem value="a">A</SegmentItem>
					<SegmentItem value="b">B</SegmentItem>
				</SegmentControl>
			</Segment>,
		)

		allBySlot(container, 'segment-item')[1]?.click()

		expect(onValueChange).toHaveBeenCalledWith('b')
	})

	it('does not call onValueChange for disabled segment items', () => {
		const onValueChange = vi.fn()

		const { container } = renderUI(
			<Segment value="a" onValueChange={onValueChange}>
				<SegmentControl>
					<SegmentItem value="a">A</SegmentItem>
					<SegmentItem value="b" disabled>
						B
					</SegmentItem>
				</SegmentControl>
			</Segment>,
		)

		allBySlot(container, 'segment-item')[1]?.click()

		expect(onValueChange).not.toHaveBeenCalled()
	})

	it('applies custom className to root', () => {
		const { container } = renderUI(
			<Segment value="a" className="custom">
				<SegmentControl>
					<SegmentItem value="a">A</SegmentItem>
				</SegmentControl>
			</Segment>,
		)

		expect(bySlot(container, 'segment')?.className).toContain('custom')
	})

	it('applies custom className to segment item', () => {
		const { container } = renderUI(
			<Segment value="a">
				<SegmentControl>
					<SegmentItem value="a" className="custom">
						A
					</SegmentItem>
				</SegmentControl>
			</Segment>,
		)

		expect(bySlot(container, 'segment-item')?.className).toContain('custom')
	})

	it('has role="radiogroup" on the control', () => {
		const { container } = renderUI(
			<Segment value="a">
				<SegmentControl>
					<SegmentItem value="a">A</SegmentItem>
				</SegmentControl>
			</Segment>,
		)

		expect(bySlot(container, 'segment-control')).toHaveAttribute('role', 'radiogroup')
	})

	it('passes aria-label to the radiogroup control', () => {
		const { container } = renderUI(
			<Segment value="a">
				<SegmentControl aria-label="View mode">
					<SegmentItem value="a">A</SegmentItem>
					<SegmentItem value="b">B</SegmentItem>
				</SegmentControl>
			</Segment>,
		)

		expect(bySlot(container, 'segment-control')).toHaveAttribute('aria-label', 'View mode')
	})
})
