import { describe, expect, it } from 'vitest'
import { Avatar, AvatarGroup } from '../../components/avatar'
import { densitySteps } from '../../core/density'
import { allBySlot, bySlot, present, renderUI } from '../helpers'

/** The width of the ring that the group puts around each avatar, in CSS pixels. */
const RING = 2

/**
 * The box of the text includes the side bearing of the last glyph, which has no
 * ink. At these sizes the side bearing is more than 1px, so the ink can touch
 * this much of the ring and stay clear.
 */
const SIDE_BEARING = 1

/**
 * Avatar geometry that only a real layout shows: jsdom loads no stylesheet.
 */
describe('avatar geometry (real browser)', () => {
	it.each(densitySteps)(
		'keeps the initials of each %s avatar clear of the next avatar in a group',
		(size) => {
			const { container } = renderUI(
				<AvatarGroup size={size}>
					<Avatar initials="GH" />
					<Avatar initials="CD" />
					<Avatar initials="AB" />
				</AvatarGroup>,
			)

			const avatars = allBySlot(container, 'avatar')

			for (const [index, avatar] of avatars.slice(0, -1).entries()) {
				const text = present(avatar.querySelector('text'), 'initials')

				const next = present(avatars[index + 1], 'next avatar')

				expect(text.getBoundingClientRect().right).toBeLessThanOrEqual(
					next.getBoundingClientRect().left - RING + SIDE_BEARING,
				)
			}
		},
	)

	it('keeps the status wrapper at the width of the circle in a stretching parent', () => {
		const { container } = renderUI(
			<div style={{ display: 'flex', flexDirection: 'column', width: 240 }}>
				<Avatar initials="AB" status="warning" />
			</div>,
		)

		const wrapper = present(bySlot(container, 'avatar-with-status'), 'status wrapper')

		const circle = present(wrapper.querySelector('[data-slot="avatar"]'), 'avatar')

		expect(wrapper.getBoundingClientRect().width).toBe(circle.getBoundingClientRect().width)
	})
})
