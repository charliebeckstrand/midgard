import { describe, expect, it, vi } from 'vitest'
import { Segment, SegmentControl, SegmentItem } from '../../components/segment'
import { allBySlot, bySlot, fireEvent, renderUI } from '../helpers'

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

		fireEvent.click(allBySlot(container, 'segment-item')[1] as HTMLElement)

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

		fireEvent.click(allBySlot(container, 'segment-item')[1] as HTMLElement)

		expect(onValueChange).not.toHaveBeenCalled()
	})

	it('sets data-current on the selected item', () => {
		const { container } = renderUI(
			<Segment value="b">
				<SegmentControl>
					<SegmentItem value="a">A</SegmentItem>
					<SegmentItem value="b">B</SegmentItem>
				</SegmentControl>
			</Segment>,
		)

		const items = allBySlot(container, 'segment-item')

		expect(items[0]).not.toHaveAttribute('data-current')
		expect(items[1]).toHaveAttribute('data-current', 'true')
	})

	it('sets tabIndex=0 on the current item and -1 on others', () => {
		const { container } = renderUI(
			<Segment value="b">
				<SegmentControl>
					<SegmentItem value="a">A</SegmentItem>
					<SegmentItem value="b">B</SegmentItem>
				</SegmentControl>
			</Segment>,
		)

		const items = allBySlot(container, 'segment-item')

		expect(items[0]).toHaveAttribute('tabindex', '-1')
		expect(items[1]).toHaveAttribute('tabindex', '0')
	})

	it('works as uncontrolled with defaultValue', () => {
		const onValueChange = vi.fn()

		const { container } = renderUI(
			<Segment defaultValue="a" onValueChange={onValueChange}>
				<SegmentControl>
					<SegmentItem value="a">A</SegmentItem>
					<SegmentItem value="b">B</SegmentItem>
				</SegmentControl>
			</Segment>,
		)

		const items = allBySlot(container, 'segment-item')

		expect(items[0]).toHaveAttribute('aria-checked', 'true')

		fireEvent.click(items[1] as HTMLElement)

		expect(onValueChange).toHaveBeenCalledWith('b')
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

	it('applies custom className to segment control', () => {
		const { container } = renderUI(
			<Segment value="a">
				<SegmentControl className="custom">
					<SegmentItem value="a">A</SegmentItem>
				</SegmentControl>
			</Segment>,
		)

		expect(bySlot(container, 'segment-control')?.className).toContain('custom')
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

	it('renders with an explicit size variant', () => {
		const { container } = renderUI(
			<Segment value="a" size="sm">
				<SegmentControl>
					<SegmentItem value="a">A</SegmentItem>
				</SegmentControl>
			</Segment>,
		)

		expect(bySlot(container, 'segment')).toBeInTheDocument()
	})

	it('renders with size="lg"', () => {
		const { container } = renderUI(
			<Segment value="a" size="lg">
				<SegmentControl>
					<SegmentItem value="a">A</SegmentItem>
				</SegmentControl>
			</Segment>,
		)

		expect(bySlot(container, 'segment')).toBeInTheDocument()
	})
})
