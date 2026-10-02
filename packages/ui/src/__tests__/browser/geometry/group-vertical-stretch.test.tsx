import { describe, expect, it } from 'vitest'
import { Button } from '../../../components/button'
import { Group } from '../../../components/group'
import { getAllSlots, getSlot, renderUI } from '../../helpers'

/**
 * A vertical Group joins its members along one edge. The members must have one
 * width, so the outer edges line up and the joined corners meet. A Button is
 * `w-fit` alone, and in a vertical Group it must stretch to the group.
 */
describe('vertical Group', () => {
	it('stretches each button to the width of the group', () => {
		const { container } = renderUI(
			<Group orientation="vertical">
				<Button>Cut</Button>
				<Button>Copy</Button>
				<Button>Paste text</Button>
			</Group>,
		)

		const group = getSlot(container, 'group').getBoundingClientRect()

		for (const button of getAllSlots(container, 'button')) {
			const box = button.getBoundingClientRect()

			expect(box.left).toBe(group.left)

			expect(box.right).toBe(group.right)
		}
	})

	it('keeps each button at its own width in a horizontal group', () => {
		const { container } = renderUI(
			<Group>
				<Button>Cut</Button>
				<Button>Paste text</Button>
			</Group>,
		)

		const [cut, paste] = getAllSlots(container, 'button').map((b) => b.getBoundingClientRect())

		expect(cut?.width).toBeLessThan(paste?.width ?? 0)
	})
})
