import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { SidebarLayout, SidebarLayoutHeader } from '../../layouts'
import { frames, getSlot, present, renderUI, screen } from '../helpers'

/**
 * The scroll model of the sidebar layout.
 *
 * Below `lg`, the page scrolls, and the navbar is the one bar that stays at the top.
 * Chrome on iOS moves the scroll offset of the page when its toolbar changes size.
 * On a page that cannot scroll, nothing takes that offset back, and the navbar went
 * out of view. A sticky header under the navbar showed a seam on iOS, so the header
 * scrolls with the content. From `lg` up, the layout stays pinned, the content
 * region scrolls, and `stickyHeader` keeps the header at its top.
 *
 * Rides the real browser because jsdom loads no stylesheet and lays nothing out.
 */

function renderTallLayout() {
	const { container } = renderUI(
		<SidebarLayout stickyHeader sidebar={<nav>Links</nav>}>
			<SidebarLayoutHeader>Title</SidebarLayoutHeader>
			<div className="h-[3000px]">Content</div>
		</SidebarLayout>,
	)

	const layout = present(container.firstElementChild, 'layout') as HTMLElement

	const header = getSlot(layout, 'header')

	const content = present(header.parentElement, 'content region')

	const navbar = present(
		screen
			.getByRole('button', { name: 'Open navigation', hidden: true })
			.closest<HTMLElement>('[data-slot=flex]'),
		'navbar',
	)

	return { layout, header, content, navbar }
}

afterEach(() => {
	window.scrollTo(0, 0)
})

describe('sidebar layout below lg (real browser)', () => {
	beforeAll(() => page.viewport(390, 664))

	it('scrolls the page, not the content region', async () => {
		const { content } = renderTallLayout()

		await frames()

		const root = document.documentElement

		expect(root.scrollHeight).toBeGreaterThan(root.clientHeight)

		expect(getComputedStyle(content).overflowY).toBe('visible')
	})

	it('keeps the navbar at the top, and scrolls the header away', async () => {
		const { header, navbar } = renderTallLayout()

		await frames()

		window.scrollTo(0, 800)

		await frames()

		expect(window.scrollY).toBe(800)

		const bar = navbar.getBoundingClientRect()

		expect(bar.top).toBeCloseTo(0, 0)

		expect(bar.height).toBeGreaterThan(0)

		expect(getComputedStyle(header).position).toBe('static')

		expect(header.getBoundingClientRect().bottom).toBeLessThan(0)
	})

	it('keeps every ancestor of the navbar free of overflow clipping', async () => {
		const { navbar } = renderTallLayout()

		await frames()

		const clipping: string[] = []

		for (let node = navbar.parentElement; node; node = node.parentElement) {
			const { overflowX, overflowY } = getComputedStyle(node)

			if (overflowX !== 'visible' || overflowY !== 'visible') {
				clipping.push(`${node.tagName.toLowerCase()} ${overflowX} ${overflowY}`)
			}
		}

		expect(clipping).toEqual([])
	})
})

describe('sidebar layout from lg up (real browser)', () => {
	beforeAll(() => page.viewport(1100, 800))

	it('pins the layout to the viewport, and scrolls the content region', async () => {
		const { layout, content, header } = renderTallLayout()

		await frames()

		const root = document.documentElement

		expect(getComputedStyle(layout).position).toBe('fixed')

		expect(root.scrollHeight).toBeLessThanOrEqual(root.clientHeight)

		expect(getComputedStyle(content).overflowY).toBe('auto')

		content.scrollTo(0, 800)

		await frames()

		// The navbar is hidden, so the sticky header sits at the top of the region.
		expect(header.getBoundingClientRect().top).toBeCloseTo(content.getBoundingClientRect().top, 0)
	})
})
