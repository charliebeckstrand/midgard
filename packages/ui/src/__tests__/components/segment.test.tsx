import { describe, expect, it, vi } from 'vitest'
import { Segment, SegmentControl, SegmentItem } from '../../components/segment'
import { allBySlot, bySlot, fireEvent, renderUI } from '../helpers'

// Segment is a thin preset over <Tabs variant="segment">, so it renders the
// tab slots (tab-list / tab) and tab ARIA (tablist / tab / aria-selected).

describe('Segment', () => {
	it('renders the control as a tablist', () => {
		const { container } = renderUI(
			<Segment value="a">
				<SegmentControl>
					<SegmentItem value="a">A</SegmentItem>
					<SegmentItem value="b">B</SegmentItem>
				</SegmentControl>
			</Segment>,
		)

		const list = bySlot(container, 'tab-list')

		expect(list).toBeInTheDocument()
		expect(list).toHaveAttribute('role', 'tablist')
	})

	it('renders segment items with role="tab"', () => {
		const { container } = renderUI(
			<Segment value="a">
				<SegmentControl>
					<SegmentItem value="a">A</SegmentItem>
					<SegmentItem value="b">B</SegmentItem>
				</SegmentControl>
			</Segment>,
		)

		const items = allBySlot(container, 'tab')

		expect(items).toHaveLength(2)

		expect(items[0]).toHaveAttribute('role', 'tab')
		expect(items[1]).toHaveAttribute('role', 'tab')
	})

	it('marks the selected segment item as aria-selected', () => {
		const { container } = renderUI(
			<Segment value="b">
				<SegmentControl>
					<SegmentItem value="a">A</SegmentItem>
					<SegmentItem value="b">B</SegmentItem>
				</SegmentControl>
			</Segment>,
		)

		const items = allBySlot(container, 'tab')

		expect(items[0]).toHaveAttribute('aria-selected', 'false')
		expect(items[1]).toHaveAttribute('aria-selected', 'true')
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

		fireEvent.click(allBySlot(container, 'tab')[1] as HTMLElement)

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

		const disabledItem = allBySlot(container, 'tab')[1] as HTMLButtonElement

		expect(disabledItem).toBeDisabled()

		fireEvent.click(disabledItem)

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

		const items = allBySlot(container, 'tab')

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

		const items = allBySlot(container, 'tab')

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

		const items = allBySlot(container, 'tab')

		expect(items[0]).toHaveAttribute('aria-selected', 'true')

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

		expect(bySlot(container, 'tab-list')?.className).toContain('custom')
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

		expect(bySlot(container, 'tab')?.className).toContain('custom')
	})

	it('passes aria-label to the control', () => {
		const { container } = renderUI(
			<Segment value="a">
				<SegmentControl aria-label="View mode">
					<SegmentItem value="a">A</SegmentItem>
					<SegmentItem value="b">B</SegmentItem>
				</SegmentControl>
			</Segment>,
		)

		expect(bySlot(container, 'tab-list')).toHaveAttribute('aria-label', 'View mode')
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
