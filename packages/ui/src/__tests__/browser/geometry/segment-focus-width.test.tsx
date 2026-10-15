import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Segment, SegmentControl, SegmentItem } from '../../../components/segment'
import { renderUI } from '../../helpers'

/**
 * Keyboard focus on a segment item that is not current. The item recipe held
 * the `::after` focus marker of a tab. A segment item does not position that
 * pseudo-element, so it became an empty flex item, and the gap of the item made
 * the item wider while it had focus.
 */
describe('Segment: keyboard focus on an item that is not current', () => {
	it('keeps the width of the item', async () => {
		renderUI(
			<Segment defaultValue="list">
				<SegmentControl aria-label="View">
					<SegmentItem value="list">List</SegmentItem>
					<SegmentItem value="board">Board</SegmentItem>
				</SegmentControl>
			</Segment>,
		)

		const board = document.querySelectorAll<HTMLElement>('[role="tab"]')[1] as HTMLElement

		const width = board.getBoundingClientRect().width

		await userEvent.keyboard('{Tab}{ArrowRight}')

		expect(board).toHaveFocus()

		expect(board.matches(':focus-visible')).toBe(true)

		expect(board.getBoundingClientRect().width).toBe(width)
	})
})
