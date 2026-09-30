import { describe, expect, it, vi } from 'vitest'
import { Segment, SegmentControl, SegmentItem } from '../../components/segment'
import { act, allBySlot, bySlot, fireEvent, renderUI, screen, setupUser } from '../helpers'

// Segment is a thin preset over <Tabs variant="segment">, so it renders the
// tab slots (tab-list / tab) and tab ARIA (tablist / tab / aria-selected).

describe('Segment', () => {
	it('renders the control as a named tablist of tab items', () => {
		const { container } = renderUI(
			<Segment value="a">
				<SegmentControl aria-label="View mode">
					<SegmentItem value="a">A</SegmentItem>
					<SegmentItem value="b">B</SegmentItem>
				</SegmentControl>
			</Segment>,
		)

		const list = bySlot(container, 'tab-list')

		expect(list).toHaveAttribute('role', 'tablist')

		expect(list).toHaveAttribute('aria-label', 'View mode')

		const items = allBySlot(container, 'tab')

		expect(items).toHaveLength(2)

		for (const item of items) expect(item).toHaveAttribute('role', 'tab')
	})

	it('marks the selected item with aria-selected, data-current, and the tab stop', () => {
		const { container } = renderUI(
			<Segment value="b">
				<SegmentControl aria-label="View">
					<SegmentItem value="a">A</SegmentItem>
					<SegmentItem value="b">B</SegmentItem>
				</SegmentControl>
			</Segment>,
		)

		const [first, second] = allBySlot(container, 'tab')

		expect(first).toHaveAttribute('aria-selected', 'false')

		expect(first).not.toHaveAttribute('data-current')

		expect(first).toHaveAttribute('tabindex', '-1')

		expect(second).toHaveAttribute('aria-selected', 'true')

		expect(second).toHaveAttribute('data-current', '')

		expect(second).toHaveAttribute('tabindex', '0')
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
})

describe('Segment keyboard navigation', () => {
	const item = (name: string) => screen.getByRole('tab', { name })

	it('moves focus across items with arrows, skipping the disabled one', async () => {
		const user = setupUser()

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
