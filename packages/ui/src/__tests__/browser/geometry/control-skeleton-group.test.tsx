import { describe, expect, it } from 'vitest'
import { ControlSkeleton } from '../../../components/control'
import { Group } from '../../../components/group'
import { Input } from '../../../components/input'
import { densitySteps } from '../../../core/density'
import { getAllSlots, getSlot, renderUI } from '../../helpers'

/**
 * A ControlSkeleton in a Group draws the joined shape. The shape follows the
 * axis of the group. In a row, the members share the width of the group. In a
 * column, each member keeps the height of the control and takes the width of
 * the group.
 *
 * Rides the real browser because the claim is a computed one: jsdom computes
 * no layout.
 */
describe('ControlSkeleton in a Group (real browser)', () => {
	it.each(densitySteps)(
		'keeps the height of a %s input in a vertical group, and takes the group width',
		(size) => {
			const input = renderUI(<Input aria-label="Name" size={size} />).container

			const control = getSlot(input, 'control-frame').getBoundingClientRect().height

			const { container } = renderUI(
				<Group orientation="vertical" className="w-72">
					<ControlSkeleton size={size} />
					<ControlSkeleton size={size} />
				</Group>,
			)

			const group = getSlot(container, 'group').getBoundingClientRect()

			for (const member of getAllSlots(container, 'placeholder')) {
				const box = member.getBoundingClientRect()

				expect(box.height).toBe(control)

				expect(box.left).toBe(group.left)

				expect(box.right).toBe(group.right)
			}
		},
	)

	it('shares the width of a horizontal group between the members', () => {
		const { container } = renderUI(
			<Group className="w-72">
				<ControlSkeleton />
				<ControlSkeleton />
			</Group>,
		)

		const group = getSlot(container, 'group').getBoundingClientRect()

		const [start, end] = getAllSlots(container, 'placeholder').map((member) =>
			member.getBoundingClientRect(),
		)

		expect(start?.left).toBe(group.left)

		expect(end?.right).toBe(group.right)

		expect(start?.width).toBe(end?.width)
	})
})
