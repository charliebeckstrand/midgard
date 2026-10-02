import { describe, expect, it } from 'vitest'
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/popover'
import { getSlot, renderUI, screen } from '../../helpers'
import { HALF_PIXEL } from '../../helpers/geometry/tolerance'

/**
 * The root of a Popover adds no box to the layout.
 *
 * The root holds the context, as the root of a Menu does, and nothing else. A block box there
 * puts the trigger on a line of its own, so a trigger inside a run of text breaks the run. With
 * `contents`, the trigger takes its place in the layout of its parent, as it does with no popover.
 */
describe('Popover root box (real browser)', () => {
	it('keeps a trigger in a run of text on the line of the text', () => {
		const { container } = renderUI(
			<div className="w-80">
				<span data-testid="before">Read</span>{' '}
				<Popover>
					<PopoverTrigger>
						<button type="button">more</button>
					</PopoverTrigger>
					<PopoverContent aria-label="Details">Body</PopoverContent>
				</Popover>{' '}
				<span data-testid="after">here</span>
			</div>,
		)

		expect(getComputedStyle(getSlot(container, 'popover')).display).toBe('contents')

		const before = screen.getByTestId('before').getBoundingClientRect()

		const trigger = screen.getByRole('button', { name: 'more' }).getBoundingClientRect()

		const after = screen.getByTestId('after').getBoundingClientRect()

		expect(trigger.left).toBeGreaterThan(before.right)

		expect(after.left).toBeGreaterThan(trigger.right)

		expect(after.bottom).toBeNear(before.bottom, HALF_PIXEL)
	})
})
