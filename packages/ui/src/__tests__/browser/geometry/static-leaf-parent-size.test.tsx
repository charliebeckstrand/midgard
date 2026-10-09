import { describe, expect, it } from 'vitest'
import { Avatar, AvatarSkeleton } from '../../../components/avatar'
import { Badge } from '../../../components/badge'
import { Button } from '../../../components/button'
import { Kbd } from '../../../components/kbd'
import { LoadingSpinner } from '../../../components/loading'
import { Sidebar, SidebarItem, SidebarLabel } from '../../../components/sidebar'
import { densitySteps } from '../../../core/density'
import { iconSize } from '../../../core/density/geometry'
import { present, renderUI } from '../../helpers'

/**
 * A static leaf in a sized parent keeps the height of the parent.
 *
 * `Kbd` and `Avatar` read no context, so each keeps its own md box unless the parent recipe
 * projects a size onto it. A Kbd in a Button suffix made an xs, sm, or md button taller. An
 * Avatar in a SidebarItem made that row 12px taller than a row with an icon, at each size. A
 * LoadingSpinner in a Badge or a SidebarItem kept its 20px box beside the icons of the row.
 *
 * Rides the real browser because the claim is a computed one: jsdom loads no stylesheet.
 */
describe('a static leaf in a sized parent (real browser)', () => {
	for (const size of densitySteps) {
		it(`keeps a ${size} Button with a Kbd suffix at the height of the button`, () => {
			const { container } = renderUI(
				<div>
					<Button size={size}>Open</Button>
					<Button size={size} suffix={<Kbd>⌘O</Kbd>}>
						Open
					</Button>
				</div>,
			)

			const [plain, withKbd] = Array.from(container.querySelectorAll('button'), (button) =>
				button.getBoundingClientRect(),
			)

			expect(withKbd?.height).toBe(plain?.height)
		})
	}

	for (const size of densitySteps) {
		it(`keeps a ${size} SidebarItem with an Avatar at the height of an item with text`, () => {
			const { container } = renderUI(
				<Sidebar>
					<SidebarItem size={size}>Home</SidebarItem>
					<SidebarItem size={size}>
						<Avatar initials="C" />
						<SidebarLabel>Charlie</SidebarLabel>
					</SidebarItem>
					<SidebarItem size={size}>
						<Avatar initials="C" status="active" />
						<SidebarLabel>Charlie</SidebarLabel>
					</SidebarItem>
					<SidebarItem size={size}>
						<AvatarSkeleton />
						<SidebarLabel>Charlie</SidebarLabel>
					</SidebarItem>
				</Sidebar>,
			)

			const [plain, withAvatar, withStatus, withSkeleton] = Array.from(
				container.querySelectorAll('button'),
				(button) => button.getBoundingClientRect(),
			)

			expect(withAvatar?.height).toBe(plain?.height)

			// The circle of an avatar with a status sits in a wrapper, and a skeleton
			// stands in for the avatar. Each keeps the height of the row too.
			expect(withStatus?.height).toBe(plain?.height)

			expect(withSkeleton?.height).toBe(plain?.height)

			const [circle, statusCircle] = Array.from(
				container.querySelectorAll('[data-slot="avatar"]'),
				(avatar) => avatar.getBoundingClientRect().width,
			)

			const skeleton = present(container.querySelector('[data-slot="placeholder"]'), 'skeleton')

			expect(statusCircle).toBe(circle)

			expect(skeleton.getBoundingClientRect().width).toBe(circle)
		})
	}

	for (const size of densitySteps) {
		it(`sizes a spinner in a ${size} Badge to the icon row`, () => {
			const { container } = renderUI(
				<Badge size={size}>
					<LoadingSpinner />
					Syncing
				</Badge>,
			)

			const spinner = present(
				container.querySelector('[data-slot="loading-spinner"]'),
				'loading spinner',
			)

			expect(spinner.getBoundingClientRect().width).toBe(iconSize(size))
		})
	}

	for (const size of densitySteps) {
		it(`sizes a spinner in a ${size} SidebarItem to the icon row`, () => {
			const { container } = renderUI(
				<Sidebar>
					<SidebarItem size={size}>
						<LoadingSpinner />
						<SidebarLabel>Syncing</SidebarLabel>
					</SidebarItem>
				</Sidebar>,
			)

			const spinner = present(
				container.querySelector('[data-slot="loading-spinner"]'),
				'loading spinner',
			)

			expect(spinner.getBoundingClientRect().width).toBe(iconSize(size))
		})
	}
})
