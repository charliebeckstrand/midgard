import type { ReactElement } from 'react'
import { hydrateRoot, type Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, onTestFinished } from 'vitest'

import { Sidebar, SidebarBody, SidebarItem, SidebarList } from '../../components/sidebar'
import { Tab, TabList, Tabs } from '../../components/tabs'
import { CurrentScrollScript } from '../../primitives/current'
import { act, attach, present } from '../helpers'

const PAGES = Array.from({ length: 40 }, (_, index) => `page-${index}`)

const TABS = Array.from({ length: 12 }, (_, index) => `Section ${index}`)

/** A sidebar in a short box. The current item is far below the fold. */
const sidebar = (
	<div style={{ height: 160, display: 'flex', flexDirection: 'column' }}>
		<Sidebar>
			<SidebarBody>
				<SidebarList>
					{PAGES.map((page) => (
						<SidebarItem key={page} href={`/${page}`} current={page === 'page-30'}>
							{page}
						</SidebarItem>
					))}
				</SidebarList>
			</SidebarBody>
		</Sidebar>
	</div>
)

/** A tab list in a narrow box. The current tab is past the end of the box. */
const tabs = (
	<div style={{ width: 240 }}>
		<Tabs defaultValue="Section 10">
			<TabList aria-label="Sections">
				{TABS.map((tab) => (
					<Tab key={tab} value={tab}>
						{tab}
					</Tab>
				))}
			</TabList>
		</Tabs>
	</div>
)

/**
 * Puts the server markup of `element` in the page and runs the script, as a
 * browser does before the first paint.
 */
function paintServerMarkup(element: ReactElement) {
	const container = attach(document.createElement('div'))

	container.innerHTML = renderToString(element)

	const script = document.createElement('script')

	script.textContent = present(
		new DOMParser()
			.parseFromString(renderToString(<CurrentScrollScript />), 'text/html')
			.querySelector('script'),
		'script',
	).textContent

	// Outside the container, so hydration finds only the server markup in it.
	attach(script)

	return container
}

/** Hydrates the server markup in `container`, which runs each effect of the tree. */
function hydrate(container: HTMLElement, element: ReactElement) {
	let root: Root | undefined

	act(() => {
		root = hydrateRoot(container, element)
	})

	onTestFinished(() => act(() => root?.unmount()))
}

/** The nearest ancestor that scrolls on `axis` and overflows. */
function scrollerOf(node: Element, axis: 'x' | 'y') {
	for (let element = node.parentElement; element; element = element.parentElement) {
		const style = getComputedStyle(element)

		const overflow = axis === 'y' ? style.overflowY : style.overflowX

		const overflows =
			axis === 'y'
				? element.scrollHeight > element.clientHeight
				: element.scrollWidth > element.clientWidth

		if ((overflow === 'auto' || overflow === 'scroll') && overflows) return element
	}

	throw new Error('no scroller')
}

/** Whether `node` is fully inside the visible box of `scroller`, within a pixel. */
function inView(node: Element, scroller: Element) {
	const item = node.getBoundingClientRect()

	const box = scroller.getBoundingClientRect()

	return (
		item.top >= box.top - 1 &&
		item.bottom <= box.bottom + 1 &&
		item.left >= box.left - 1 &&
		item.right <= box.right + 1
	)
}

describe('CurrentScrollScript (real browser)', () => {
	it('scrolls the current sidebar item into view in its scroller', () => {
		const container = paintServerMarkup(sidebar)

		const item = present(
			container.querySelector('[data-slot="sidebar-item-inner"][data-current]'),
			'current item',
		)

		const scroller = scrollerOf(item, 'y')

		expect(scroller.scrollTop).toBeGreaterThan(0)

		expect(inView(item, scroller)).toBe(true)
	})

	it('leaves the scroll of the sidebar as it is at hydration', () => {
		const container = paintServerMarkup(sidebar)

		const item = present(
			container.querySelector('[data-slot="sidebar-item-inner"][data-current]'),
			'current item',
		)

		const scroller = scrollerOf(item, 'y')

		const before = scroller.scrollTop

		hydrate(container, sidebar)

		expect(scroller.scrollTop).toBe(before)
	})

	it('scrolls the current tab into view in its tab list', () => {
		const container = paintServerMarkup(tabs)

		const tab = present(container.querySelector('[data-slot="tab"][data-current]'), 'current tab')

		const scroller = present(
			container.querySelector('[data-slot="tab-list-scroll"]'),
			'tab list scroller',
		)

		expect(scroller.scrollLeft).toBeGreaterThan(0)

		expect(inView(tab, scroller)).toBe(true)

		const before = scroller.scrollLeft

		hydrate(container, tabs)

		expect(scroller.scrollLeft).toBe(before)
	})

	it('does not scroll the page', () => {
		const spacer = attach(document.createElement('div'))

		spacer.style.height = '3000px'

		window.scrollTo(0, 0)

		paintServerMarkup(sidebar)

		paintServerMarkup(tabs)

		expect(window.scrollY).toBe(0)
	})
})
