import { type ReactNode, useLayoutEffect, useRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { describe, expect, it, onTestFinished } from 'vitest'

import { Tab, TabList, Tabs, type TabsOrientation } from '../../components/tabs'
import { act, attach, present } from '../helpers'

const TABS = Array.from({ length: 12 }, (_, index) => `Section ${index}`)

/**
 * Reads the scroll of the tab list in a layout effect of an ancestor. React
 * runs it after the layout work of the tab list and before the browser paints,
 * so it gets the scroll of the first paint.
 */
function FirstPaint({
	children,
	onPaint,
}: {
	children: ReactNode
	onPaint: (scroller: HTMLElement, tab: HTMLElement) => void
}) {
	const ref = useRef<HTMLDivElement>(null)

	useLayoutEffect(() => {
		const box = present(ref.current, 'box')

		onPaint(
			present(box.querySelector('[data-slot="tab-list-scroll"]'), 'tab list scroller'),
			present(box.querySelector('[data-slot="tab"][data-current]'), 'current tab'),
		)
	}, [onPaint])

	return <div ref={ref}>{children}</div>
}

/** A tab list in a small box. The current tab is past the end of the box by default. */
function LongTabs({ orientation, value }: { orientation: TabsOrientation; value?: string }) {
	const box = orientation === 'horizontal' ? { width: 240 } : { height: 120 }

	return (
		<div style={box}>
			<Tabs value={value} defaultValue="Section 10" orientation={orientation} style={box}>
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
}

/** Whether `tab` is fully inside the visible box of `scroller`, within a pixel. */
function inView(tab: Element, scroller: Element) {
	const item = tab.getBoundingClientRect()

	const box = scroller.getBoundingClientRect()

	return (
		item.top >= box.top - 1 &&
		item.bottom <= box.bottom + 1 &&
		item.left >= box.left - 1 &&
		item.right <= box.right + 1
	)
}

/** Mounts the tabs on the client, as a client navigation does, and returns the state of the first paint. */
function mountOnClient(orientation: TabsOrientation) {
	const container = attach(document.createElement('div'))

	let root: Root | undefined

	// The layout effect overwrites this. A tab list that never paints fails both checks.
	const painted = { scroll: 0, visible: false }

	act(() => {
		root = createRoot(container)

		root.render(
			<FirstPaint
				onPaint={(scroller, tab) => {
					painted.scroll = orientation === 'horizontal' ? scroller.scrollLeft : scroller.scrollTop

					painted.visible = inView(tab, scroller)
				}}
			>
				<LongTabs orientation={orientation} />
			</FirstPaint>,
		)
	})

	onTestFinished(() => act(() => root?.unmount()))

	return painted
}

/**
 * Mounts the tabs on the client with the first tab current, then makes the far
 * tab current without a move of focus, as the Back button of the browser does.
 * The current tab changes in a second commit, after the store of the root
 * publishes in a layout effect. Thus the check reads after `act` and before the
 * test yields to the browser, so it gets the state of the next paint.
 */
function selectWithoutFocus(orientation: TabsOrientation) {
	const container = attach(document.createElement('div'))

	let root: Root | undefined

	act(() => {
		root = createRoot(container)

		root.render(<LongTabs orientation={orientation} value="Section 0" />)
	})

	onTestFinished(() => act(() => root?.unmount()))

	act(() => root?.render(<LongTabs orientation={orientation} value="Section 10" />))

	const scroller = present(
		container.querySelector('[data-slot="tab-list-scroll"]'),
		'tab list scroller',
	)

	const tab = present(container.querySelector('[data-slot="tab"][data-current]'), 'current tab')

	return {
		scroll: orientation === 'horizontal' ? scroller.scrollLeft : scroller.scrollTop,
		visible: inView(tab, scroller),
	}
}

describe('TabList mount scroll (real browser)', () => {
	it('paints a horizontal list with the current tab in view', () => {
		const painted = mountOnClient('horizontal')

		expect(painted.scroll).toBeGreaterThan(0)

		expect(painted.visible).toBe(true)
	})

	it('paints a vertical list with the current tab in view', () => {
		const painted = mountOnClient('vertical')

		expect(painted.scroll).toBeGreaterThan(0)

		expect(painted.visible).toBe(true)
	})
})

describe('TabList selection scroll (real browser)', () => {
	it('paints a horizontal list with a tab that becomes current in view', () => {
		const painted = selectWithoutFocus('horizontal')

		expect(painted.scroll).toBeGreaterThan(0)

		expect(painted.visible).toBe(true)
	})

	it('paints a vertical list with a tab that becomes current in view', () => {
		const painted = selectWithoutFocus('vertical')

		expect(painted.scroll).toBeGreaterThan(0)

		expect(painted.visible).toBe(true)
	})
})
