import { describe, expect, it } from 'vitest'
import { SidebarLayout, SidebarLayoutAside, SidebarLayoutBody } from '../../../layouts'
import { present, renderUI } from '../../helpers'
import { HALF_PIXEL } from '../../helpers/geometry/tolerance'

/**
 * The card of the aside of the inline sidebar layout. The aside sits on the
 * gray ground of the layout, and muted text there does not have the contrast
 * of WCAG 1.4.3, so its content goes in a `SidebarLayoutAside`. The card has
 * the surface and the gutter of the content card. A card that does not show
 * takes no room: the docs always pass `EventsAside`, which hides itself until
 * the events are pinned, and the column must then paint no edge and no gap.
 *
 * Rides the real browser because jsdom loads no stylesheet and lays nothing out.
 */

const GUTTER = 8

function renderAside(className?: string) {
	const { container } = renderUI(
		<div className="h-[400px] w-[900px] @container-size">
			<SidebarLayout
				layout="inline"
				sidebar={<nav>Links</nav>}
				aside={
					<SidebarLayoutAside aria-label="Details" className={className}>
						Details
					</SidebarLayoutAside>
				}
			>
				<SidebarLayoutBody>Content</SidebarLayoutBody>
			</SidebarLayout>
		</div>,
	)

	// The layout fills the frame.
	const frame = present(container.firstElementChild, 'frame')

	const column = present(
		container.querySelector<HTMLElement>('[data-slot=sidebar-aside]'),
		'aside column',
	)

	const card = present(column.querySelector<HTMLElement>('[data-slot=aside]'), 'aside card')

	const content = present(
		container.querySelector<HTMLElement>('[data-slot=sidebar-content]'),
		'content card',
	)

	return { frame, column, card, content }
}

describe('the card of the sidebar layout aside (real browser)', () => {
	it('paints the surface of the content card in the gutter of the content', () => {
		const { column, card, content } = renderAside()

		expect(card.tagName).toBe('ASIDE')

		const cardStyle = getComputedStyle(card)
		const contentStyle = getComputedStyle(content)

		expect(cardStyle.backgroundColor).toBe(contentStyle.backgroundColor)

		expect(cardStyle.getPropertyValue('--surface-fill')).toBe(
			contentStyle.getPropertyValue('--surface-fill'),
		)

		expect(cardStyle.borderRadius).toBe(contentStyle.borderRadius)

		expect(cardStyle.boxShadow).toBe(contentStyle.boxShadow)

		const box = column.getBoundingClientRect()
		const rect = card.getBoundingClientRect()

		// The card fills the column inside the gutter, and its top meets the top of the content card.
		expect(rect.top - box.top).toBeNear(GUTTER, HALF_PIXEL)

		expect(box.bottom - rect.bottom).toBeNear(GUTTER, HALF_PIXEL)

		expect(box.right - rect.right).toBeNear(GUTTER, HALF_PIXEL)

		expect(rect.top).toBeNear(content.getBoundingClientRect().top, HALF_PIXEL)
	})

	it('takes no room while the card does not show', () => {
		const { frame, column, content } = renderAside('hidden')

		expect(column.getBoundingClientRect().width).toBe(0)

		// The content card keeps the one gutter at the end edge.
		const end = frame.getBoundingClientRect().right - content.getBoundingClientRect().right

		expect(end).toBeNear(GUTTER, HALF_PIXEL)
	})
})
