import { describe, expect, it, vi } from 'vitest'
import { Segment, SegmentControl, SegmentItem } from '../../components/segment'
import { TabContent, TabContents } from '../../components/tabs'
import { ControlLockContext } from '../../primitives/control/context'
import { act, allBySlot, bySlot, fireEvent, renderUI, screen, setupUser } from '../helpers'

// Segment is a thin preset over <Tabs variant="segment">, so it renders the
// tab slots (tab-list / tab). With no panels it picks a value, so it takes the
// radio ARIA (radiogroup / radio / aria-checked). With panels it keeps the tab
// ARIA (tablist / tab / aria-selected).

describe('Segment', () => {
	it('renders a control with no panels as a named radiogroup of radio items', () => {
		const { container } = renderUI(
			<Segment value="a">
				<SegmentControl aria-label="View mode">
					<SegmentItem value="a">A</SegmentItem>
					<SegmentItem value="b">B</SegmentItem>
				</SegmentControl>
			</Segment>,
		)

		const list = bySlot(container, 'tab-list')

		expect(list).toHaveAttribute('role', 'radiogroup')

		expect(list).toHaveAttribute('aria-label', 'View mode')

		expect(list).not.toHaveAttribute('aria-orientation')

		const items = allBySlot(container, 'tab')

		expect(items).toHaveLength(2)

		for (const item of items) {
			expect(item).toHaveAttribute('role', 'radio')

			expect(item).not.toHaveAttribute('aria-selected')

			expect(item).not.toHaveAttribute('aria-controls')
		}
	})

	it('keeps the tab roles while the group renders panels', () => {
		const { container } = renderUI(
			<Segment value="a">
				<SegmentControl aria-label="View mode">
					<SegmentItem value="a">A</SegmentItem>
					<SegmentItem value="b">B</SegmentItem>
				</SegmentControl>
				<TabContents>
					<TabContent value="a">Panel A</TabContent>
					<TabContent value="b">Panel B</TabContent>
				</TabContents>
			</Segment>,
		)

		expect(bySlot(container, 'tab-list')).toHaveAttribute('role', 'tablist')

		const [first, second] = allBySlot(container, 'tab')

		expect(first).toHaveAttribute('role', 'tab')

		expect(first).toHaveAttribute('aria-selected', 'true')

		expect(first).not.toHaveAttribute('aria-checked')

		expect(second).toHaveAttribute('aria-selected', 'false')
	})

	it('marks the selected item with aria-checked, data-current, and the tab stop', () => {
		const { container } = renderUI(
			<Segment value="b">
				<SegmentControl aria-label="View">
					<SegmentItem value="a">A</SegmentItem>
					<SegmentItem value="b">B</SegmentItem>
				</SegmentControl>
			</Segment>,
		)

		const [first, second] = allBySlot(container, 'tab')

		expect(first).toHaveAttribute('aria-checked', 'false')

		expect(first).not.toHaveAttribute('data-current')

		expect(first).toHaveAttribute('tabindex', '-1')

		expect(second).toHaveAttribute('aria-checked', 'true')

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

		expect(items[0]).toHaveAttribute('aria-checked', 'true')

		fireEvent.click(items[1] as HTMLElement)

		expect(onValueChange).toHaveBeenCalledWith('b')
	})
})

describe('Segment keyboard navigation', () => {
	const item = (name: string) => screen.getByRole('radio', { name })

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

	// A group of radios selects the item that an arrow key focuses.
	it('selects the item that an arrow key focuses in a group with no panels', async () => {
		const user = setupUser()

		const onValueChange = vi.fn()

		renderUI(
			<Segment defaultValue="a" onValueChange={onValueChange}>
				<SegmentControl aria-label="View">
					<SegmentItem value="a">A</SegmentItem>
					<SegmentItem value="b">B</SegmentItem>
				</SegmentControl>
			</Segment>,
		)

		act(() => item('A').focus())

		await user.keyboard('{ArrowRight}')

		expect(item('B')).toHaveFocus()

		expect(item('B')).toHaveAttribute('aria-checked', 'true')

		expect(item('B')).toHaveAttribute('tabindex', '0')

		expect(onValueChange).toHaveBeenCalledWith('b')
	})

	// A tab list with panels activates a tab by a press, not by focus.
	it('moves only the focus in a group with panels', async () => {
		const user = setupUser()

		const onValueChange = vi.fn()

		renderUI(
			<Segment defaultValue="a" onValueChange={onValueChange}>
				<SegmentControl aria-label="View">
					<SegmentItem value="a">A</SegmentItem>
					<SegmentItem value="b">B</SegmentItem>
				</SegmentControl>
				<TabContents>
					<TabContent value="a">Panel A</TabContent>
					<TabContent value="b">Panel B</TabContent>
				</TabContents>
			</Segment>,
		)

		const tab = (name: string) => screen.getByRole('tab', { name })

		act(() => tab('A').focus())

		await user.keyboard('{ArrowRight}')

		expect(tab('B')).toHaveFocus()

		expect(onValueChange).not.toHaveBeenCalled()
	})

	// A pick that shows a view or writes the address waits for Enter or Space.
	it('keeps the tab roles and moves only the focus with manual activation', async () => {
		const user = setupUser()

		const onValueChange = vi.fn()

		renderUI(
			<Segment defaultValue="a" activation="manual" onValueChange={onValueChange}>
				<SegmentControl aria-label="View">
					<SegmentItem value="a">A</SegmentItem>
					<SegmentItem value="b">B</SegmentItem>
				</SegmentControl>
			</Segment>,
		)

		expect(screen.getByRole('tablist', { name: 'View' })).toBeInTheDocument()

		const tab = (name: string) => screen.getByRole('tab', { name })

		act(() => tab('A').focus())

		await user.keyboard('{ArrowRight}')

		expect(tab('B')).toHaveFocus()

		expect(onValueChange).not.toHaveBeenCalled()

		await user.keyboard('{Enter}')

		expect(onValueChange).toHaveBeenCalledWith('b')

		expect(tab('B')).toHaveAttribute('aria-selected', 'true')
	})
})

describe('Segment in a locked scope', () => {
	it('keeps an item live by default, and locks a lockable item', () => {
		const onValueChange = vi.fn()

		renderUI(
			<ControlLockContext value>
				<Segment value="a" onValueChange={onValueChange}>
					<SegmentControl aria-label="View">
						<SegmentItem value="a">A</SegmentItem>
						<SegmentItem value="b">B</SegmentItem>
						<SegmentItem value="c" lockable>
							C
						</SegmentItem>
					</SegmentControl>
				</Segment>
			</ControlLockContext>,
		)

		const b = screen.getByRole('radio', { name: 'B' })

		const c = screen.getByRole('radio', { name: 'C' })

		expect(b).not.toHaveAttribute('aria-disabled')

		expect(c).toHaveAttribute('aria-disabled', 'true')

		fireEvent.click(c)

		expect(onValueChange).not.toHaveBeenCalled()

		fireEvent.click(b)

		expect(onValueChange).toHaveBeenCalledWith('b')
	})
})
