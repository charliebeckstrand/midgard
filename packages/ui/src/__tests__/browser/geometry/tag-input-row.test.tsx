import { describe, expect, it } from 'vitest'
import { TagInput } from '../../../components/tag-input'
import { getSlot, renderUI, screen } from '../../helpers'
import { HALF_PIXEL } from '../../helpers/geometry/tolerance'

const tags = ['Design systems', 'Accessibility', 'Forms', 'Motion', 'Typography']

function middle(element: Element): number {
	const box = element.getBoundingClientRect()

	return box.top + box.height / 2
}

/**
 * The tags of a TagInput stay on one row and scroll, and `wrap` lets them wrap.
 *
 * Rides the real browser because the claim is a computed one: jsdom lays out no box.
 */
describe('the tag row of a TagInput (real browser)', () => {
	it('stays on one row and scrolls by default', () => {
		const { container } = renderUI(
			<div style={{ width: 300 }}>
				<TagInput aria-label="Topics" defaultValue={tags} />
			</div>,
		)

		const list = getSlot(container, 'tags')

		const [first, ...rest] = screen.getAllByRole('listitem') as [HTMLElement, ...HTMLElement[]]

		for (const chip of rest) expect(middle(chip)).toBeNear(middle(first), HALF_PIXEL)

		expect(list.scrollWidth).toBeGreaterThan(list.clientWidth)

		const input = screen.getByRole('textbox')

		expect(middle(input)).toBeNear(middle(first), HALF_PIXEL)

		// The tags give way, and the add button keeps its full box.
		const suffix = getSlot(container, 'suffix')

		expect(suffix.scrollWidth).toBeLessThanOrEqual(suffix.clientWidth)
	})

	it('wraps with `wrap`, and keeps the add button on the first row at the end', () => {
		const { container } = renderUI(
			<div style={{ width: 300 }}>
				<TagInput aria-label="Topics" defaultValue={tags} wrap />
			</div>,
		)

		const chips = screen.getAllByRole('listitem')

		const first = chips[0] as HTMLElement

		const last = chips.at(-1) as HTMLElement

		expect(middle(last)).toBeGreaterThan(middle(first))

		const add = screen.getByRole('button', { name: 'Add tag' })

		expect(middle(add)).toBeNear(middle(first), HALF_PIXEL)

		const frame = getSlot(container, 'tags').closest('[data-slot=prefix]')?.parentElement

		const end = frame?.getBoundingClientRect().right ?? 0

		for (const chip of chips) {
			expect(chip.getBoundingClientRect().right).toBeLessThanOrEqual(
				add.getBoundingClientRect().left,
			)
		}

		expect(add.getBoundingClientRect().right).toBeLessThanOrEqual(end)

		const input = screen.getByRole('textbox')

		expect(input.getBoundingClientRect().top).toBeGreaterThanOrEqual(
			last.getBoundingClientRect().bottom,
		)
	})
})
