import type { ReactNode } from 'react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { rootOffcanvasSidebarClass } from '../../../core/sidebar/root'
import { SidebarLayout, SidebarLayoutHeader } from '../../../layouts'
import { frames, getSlot, present, renderUI, screen } from '../../helpers'
import { HALF_PIXEL } from '../../helpers/geometry/tolerance'

/**
 * The scroll model of the sidebar layout.
 *
 * The page scrolls at each width. Chrome on iOS moves the scroll offset of the page
 * when its toolbar changes size. On a page that cannot scroll, nothing takes that
 * offset back, and the navbar went out of view. The scroll restoration of a router
 * also reads and sets only the scroll position of the page. From `lg` up, the layout
 * was pinned to the viewport, and only its content region scrolled. A new page then
 * did not start at the top, and Back did not restore the position.
 *
 * Below `lg`, the navbar is the one bar that stays at the top. A sticky header under
 * the navbar showed a seam on iOS, so the header scrolls with the content. From `lg`
 * up, the desktop panel sticks to the top and scrolls on its own, and `stickyHeader`
 * keeps the header at the top of the page.
 *
 * Rides the real browser because jsdom loads no stylesheet and lays nothing out.
 */

function renderTallLayout(sidebar: ReactNode = <nav>Links</nav>) {
	const { container, unmount } = renderUI(
		<SidebarLayout stickyHeader sidebar={sidebar}>
			<SidebarLayoutHeader>Title</SidebarLayoutHeader>
			<div className="h-[3000px]">Content</div>
		</SidebarLayout>,
	)

	const layout = present(container.firstElementChild, 'layout') as HTMLElement

	const header = getSlot(layout, 'header')

	const content = present(header.parentElement, 'content region')

	// The bar is the section that holds the menu button.
	const navbar = present(
		screen
			.getByRole('button', { name: 'Open navigation', hidden: true })
			.closest<HTMLElement>('section'),
		'navbar',
	)

	// The inline desktop panel holds the sidebar. The closed drawer renders no copy.
	const panel = present(screen.getByText('Links').parentElement, 'desktop panel')

	return { layout, header, content, navbar, panel, unmount }
}

/** The ancestors of `node` that clip or scroll on an axis, from the parent up. */
function clippingAncestors(node: HTMLElement): string[] {
	const clipping: string[] = []

	for (let ancestor = node.parentElement; ancestor; ancestor = ancestor.parentElement) {
		const { overflowX, overflowY } = getComputedStyle(ancestor)

		if (overflowX !== 'visible' || overflowY !== 'visible') {
			clipping.push(`${ancestor.tagName.toLowerCase()} ${overflowX} ${overflowY}`)
		}
	}

	return clipping
}

afterEach(() => {
	window.scrollTo(0, 0)

	document.documentElement.classList.remove(rootOffcanvasSidebarClass)
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

		expect(bar.top).toBeNear(0, HALF_PIXEL)

		expect(bar.height).toBeGreaterThan(0)

		expect(getComputedStyle(header).position).toBe('static')

		expect(header.getBoundingClientRect().bottom).toBeLessThan(0)
	})

	it('keeps every ancestor of the navbar free of overflow clipping', async () => {
		const { navbar } = renderTallLayout()

		await frames()

		expect(clippingAncestors(navbar)).toEqual([])
	})

	it('names the height of the navbar as the scroll padding of the page', async () => {
		const { navbar } = renderTallLayout()

		await frames()

		const padding = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop)

		expect(padding).toBeNear(navbar.getBoundingClientRect().height, HALF_PIXEL)
	})
})

describe('sidebar layout from lg up (real browser)', () => {
	beforeAll(() => page.viewport(1100, 800))

	it('scrolls the page, not the content region', async () => {
		const { layout, content } = renderTallLayout()

		await frames()

		const root = document.documentElement

		expect(getComputedStyle(layout).position).toBe('relative')

		expect(root.scrollHeight).toBeGreaterThan(root.clientHeight)

		expect(getComputedStyle(content).overflowY).toBe('visible')
	})

	it('keeps the panel and the sticky header at the top while the page scrolls', async () => {
		const { header, panel } = renderTallLayout()

		await frames()

		window.scrollTo(0, 800)

		await frames()

		expect(window.scrollY).toBe(800)

		const box = panel.getBoundingClientRect()

		expect(box.top).toBeNear(0, HALF_PIXEL)

		expect(box.height).toBeNear(window.innerHeight, HALF_PIXEL)

		// The navbar is hidden, so the sticky header sits at the top of the page.
		expect(header.getBoundingClientRect().top).toBeNear(0, HALF_PIXEL)
	})

	it('scrolls a long sidebar in its own panel, and not the page', async () => {
		const { panel } = renderTallLayout(<nav className="h-[2000px]">Links</nav>)

		await frames()

		expect(panel.scrollHeight).toBeGreaterThan(panel.clientHeight)

		panel.scrollTo(0, 500)

		await frames()

		expect(panel.scrollTop).toBe(500)

		expect(window.scrollY).toBe(0)
	})

	it('stops a wheel scroll at the end of the panel, and does not scroll the page', async () => {
		const { panel } = renderTallLayout(<nav className="h-[2000px]">Links</nav>)

		await frames()

		const end = panel.scrollHeight - panel.clientHeight

		panel.scrollTo(0, end)

		await frames()

		await userEvent.wheel(panel, { delta: { y: 400 } })

		await frames()

		expect(panel.scrollTop).toBeNear(end, HALF_PIXEL)

		expect(window.scrollY).toBe(0)
	})

	it('keeps every ancestor of the sticky header free of overflow clipping', async () => {
		const { header } = renderTallLayout()

		await frames()

		expect(clippingAncestors(header)).toEqual([])
	})

	it('fills the viewport when the content is short', async () => {
		const { container } = renderUI(<SidebarLayout sidebar={<nav>Links</nav>}>Short</SidebarLayout>)

		await frames()

		const layout = present(container.firstElementChild, 'layout')

		expect(layout.getBoundingClientRect().height).toBeNear(window.innerHeight, HALF_PIXEL)
	})

	it('fills the width of a parent that is a flex row', async () => {
		const { container } = renderUI(
			<div className="flex justify-center">
				<SidebarLayout sidebar={<nav>Links</nav>}>Short</SidebarLayout>
			</div>,
		)

		await frames()

		const row = present(container.firstElementChild, 'flex row')

		expect(present(row.firstElementChild, 'layout')).toMatchBox(row)
	})

	it('keeps the hover strip of the floating sidebar on the start edge after a scroll', async () => {
		document.documentElement.classList.add(rootOffcanvasSidebarClass)

		const { container } = renderUI(
			<SidebarLayout sidebar={<nav>Links</nav>}>
				<div className="h-[3000px]">Content</div>
			</SidebarLayout>,
		)

		await frames()

		window.scrollTo(0, 800)

		await frames()

		const strip = present(
			container.firstElementChild?.querySelector<HTMLElement>(':scope > [aria-hidden]'),
			'hover strip',
		)

		expect(document.elementFromPoint(2, window.innerHeight / 2)).toBe(strip)
	})
})

describe('sidebar layout scroll padding from lg up (real browser)', () => {
	beforeAll(() => page.viewport(1100, 800))

	it('names the height of the sticky header, and clears it on unmount', async () => {
		const { header, unmount } = renderTallLayout()

		await frames()

		const root = document.documentElement

		expect(Number.parseFloat(getComputedStyle(root).scrollPaddingTop)).toBeNear(
			header.getBoundingClientRect().height,
			HALF_PIXEL,
		)

		unmount()

		expect(root.style.scrollPaddingTop).toBe('')
	})
})

describe('sidebar layout in a size container (real browser)', () => {
	beforeAll(() => page.viewport(1100, 800))

	/** A box that scrolls, as a demo frame does, around the layout. */
	function renderInBox(children: ReactNode) {
		const { container } = renderUI(
			<div className="@container-size h-[400px] overflow-auto">
				<SidebarLayout stickyHeader sidebar={<nav>Links</nav>}>
					<SidebarLayoutHeader>Title</SidebarLayoutHeader>
					{children}
				</SidebarLayout>
			</div>,
		)

		const box = present(container.firstElementChild, 'box')

		return {
			box,
			layout: present(box.firstElementChild, 'layout'),
			header: getSlot(box, 'header'),
			panel: present(screen.getByText('Links').parentElement, 'desktop panel'),
		}
	}

	it('puts the scroll padding on the box, not on the page', async () => {
		const { box, header } = renderInBox('Short')

		await frames()

		expect(document.documentElement.style.scrollPaddingTop).toBe('')

		expect(Number.parseFloat(box.style.scrollPaddingTop)).toBeNear(
			header.getBoundingClientRect().height,
			HALF_PIXEL,
		)
	})

	it('fills the box, and not the viewport, when the content is short', async () => {
		const { box, layout, panel } = renderInBox('Short')

		await frames()

		expect(layout).toMatchBox(box)

		expect(panel.getBoundingClientRect().height).toBeNear(400, HALF_PIXEL)
	})

	it('scrolls the box in place of the page, and keeps the panel and the header at its top', async () => {
		const { box, header, panel } = renderInBox(<div className="h-[3000px]">Content</div>)

		await frames()

		const root = document.documentElement

		expect(root.scrollHeight).toBeLessThanOrEqual(root.clientHeight)

		box.scrollTo(0, 800)

		await frames()

		const top = box.getBoundingClientRect().top

		expect(panel.getBoundingClientRect().top).toBeNear(top, HALF_PIXEL)

		expect(panel.getBoundingClientRect().height).toBeNear(400, HALF_PIXEL)

		expect(header.getBoundingClientRect().top).toBeNear(top, HALF_PIXEL)
	})
})
