import { describe, expect, it } from 'vitest'
import { Avatar } from '../../components/avatar'
import { Badge } from '../../components/badge'
import { Button } from '../../components/button'
import { Kbd } from '../../components/kbd'
import { LoadingSpinner } from '../../components/loading'
import { Sidebar, SidebarItem, SidebarLabel } from '../../components/sidebar'
import { present, renderUI } from '../helpers'

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
	for (const size of ['xs', 'sm', 'md', 'lg'] as const) {
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

	for (const size of ['sm', 'md', 'lg'] as const) {
		it(`keeps a ${size} SidebarItem with an Avatar at the height of an item with text`, () => {
			const { container } = renderUI(
				<Sidebar>
					<SidebarItem size={size}>Home</SidebarItem>
					<SidebarItem size={size}>
						<Avatar initials="C" />
						<SidebarLabel>Charlie</SidebarLabel>
					</SidebarItem>
				</Sidebar>,
			)

			const [plain, withAvatar] = Array.from(container.querySelectorAll('button'), (button) =>
				button.getBoundingClientRect(),
			)

			expect(withAvatar?.height).toBe(plain?.height)
		})
	}

	const ICON_PX = { xs: 12, sm: 16, md: 20, lg: 24 } as const

	for (const size of ['xs', 'sm', 'md', 'lg'] as const) {
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

			expect(spinner.getBoundingClientRect().width).toBe(ICON_PX[size])
		})
	}

	for (const size of ['sm', 'md', 'lg'] as const) {
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

			expect(spinner.getBoundingClientRect().width).toBe(ICON_PX[size])
		})
	}
})
