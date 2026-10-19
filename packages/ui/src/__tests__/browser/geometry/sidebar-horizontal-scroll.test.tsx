import { Folder, Plus } from 'lucide-react'
import { describe, expect, it, onTestFinished } from 'vitest'
import { Button } from '../../../components/button'
import { Icon } from '../../../components/icon'
import {
	Sidebar,
	SidebarBody,
	SidebarItem,
	SidebarLabel,
	SidebarList,
	SidebarSection,
} from '../../../components/sidebar'
import { Flex } from '../../../structure/flex'
import { getSlot, renderUI } from '../../helpers'

/**
 * A sidebar never scrolls on the horizontal axis.
 *
 * On a phone, the body of the docs "Sections divider and spacer" demo scrolled
 * a few pixels to the side. The 44px hit area of the small add button at the
 * end of a section row went past the edge of the body, and the vertical
 * scroller of the body also scrolled that overflow. The nav and the body now
 * clip the horizontal axis, and a long label truncates.
 *
 * This suite cannot match `pointer: coarse`, so the case sets the 44px floor on
 * each hit area with a stylesheet (`hit-area-overlap.test.tsx`). Rides the real
 * browser because jsdom loads no stylesheet and lays nothing out.
 */
describe('sidebar horizontal scroll (real browser)', () => {
	function coarseFloor() {
		const sheet = document.createElement('style')

		sheet.textContent = '[data-slot="touch-target"] { --touch-target-floor: 2.75rem !important; }'

		document.head.append(sheet)

		onTestFinished(() => sheet.remove())
	}

	it('keeps the nav and the body to their width at a phone width', () => {
		coarseFloor()

		const { container } = renderUI(
			<div style={{ width: 300, height: 400 }}>
				<Sidebar>
					<SidebarBody>
						<SidebarSection>
							<Flex align="center" justify="between" gap="sm">
								<span>Projects</span>
								<Button variant="plain" size="sm" aria-label="New project">
									<Icon icon={<Plus />} />
								</Button>
							</Flex>
							<SidebarList aria-label="Projects">
								<SidebarItem icon={<Folder />}>
									<SidebarLabel>
										A project name that is much too long for the width of a phone sidebar
									</SidebarLabel>
								</SidebarItem>
							</SidebarList>
						</SidebarSection>
					</SidebarBody>
				</Sidebar>
			</div>,
		)

		const bodySlot = getSlot(container, 'sidebar-body')

		// The hit area goes past the edge, so the content of the body is wider than the body.
		// A reader can scroll that overflow only when the axis is `auto` or `scroll`.
		expect(bodySlot.scrollWidth).toBeGreaterThan(bodySlot.clientWidth)

		for (const slot of ['sidebar', 'sidebar-body']) {
			expect(getComputedStyle(getSlot(container, slot)).overflowX, slot).toBe('hidden')
		}

		const body = bodySlot.getBoundingClientRect()

		const label = getSlot(container, 'sidebar-label')

		expect(label.getBoundingClientRect().right).toBeLessThanOrEqual(body.right)

		expect(label.scrollWidth).toBeGreaterThan(label.clientWidth)
	})
})
