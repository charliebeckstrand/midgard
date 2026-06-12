import { describe, expect, it, vi } from 'vitest'
import { Segment, SegmentControl, SegmentItem, SegmentSkeleton } from '../../components/segment'
import { act, allBySlot, bySlot, fireEvent, renderUI, screen, userEvent } from '../helpers'

// Segment is a thin preset over <Tabs variant="segment">, so it renders the
// tab slots (tab-list / tab) and tab ARIA (tablist / tab / aria-selected).

describe('Segment', () => {
	it('pairs with an explicit SegmentSkeleton in loading trees', () => {
		const { container } = renderUI(<SegmentSkeleton />)

		expect(bySlot(container, 'tab-list')).not.toBeInTheDocument()

		expect(bySlot(container, 'placeholder')).toBeInTheDocument()
	})

	it('renders the control as a tablist', () => {
		const { container } = renderUI(
			<Segment value="a">
				<SegmentControl aria-label="View">
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
				<SegmentControl aria-label="View">
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
				<SegmentControl aria-label="View">
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
				<SegmentControl aria-label="View">
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
				<SegmentControl aria-label="View">
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
				<SegmentControl aria-label="View">
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
				<SegmentControl aria-label="View">
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
				<SegmentControl aria-label="View">
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
})

describe('Segment keyboard navigation', () => {
	const item = (name: string) => screen.getByRole('tab', { name })

	it('moves focus across items with arrows, skipping the disabled one', async () => {
		const user = userEvent.setup()

		renderUI(
			<Segment value="a">
				<SegmentControl aria-label="View">
					<SegmentItem value="a">A</SegmentItem>
					<SegmentItem value="b" disabled>
						B
					</SegmentItem>
					<SegmentItem value="c">C</SegmentItem>
				</SegmentControl>
			</Segment>,
		)

		act(() => item('A').focus())

		await user.keyboard('{ArrowRight}')

		expect(item('C')).toHaveFocus()

		await user.keyboard('{Home}')

		expect(item('A')).toHaveFocus()
	})
})
