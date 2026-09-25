import { useMemo, useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Nav, NavItem, NavList } from '../../components/nav'
import { useNavItem } from '../../components/nav/use-nav-item'
import { TabList, Tabs } from '../../components/tabs'
import { Tab } from '../../components/tabs/tab'
import { act, fireEvent, renderUI, screen } from '../helpers'

/**
 * A change of the current value renders only the tab or the nav item that
 * stops being current and the one that becomes current.
 *
 * The current value was in the `Current` context, and each tab and nav item
 * read it to find its own `current`. A change therefore rendered each item.
 * Each item now reads its own value from a keyed store.
 *
 * The count needs a module mock, so this suite sits in `boundary/`.
 */
vi.mock('../../components/tabs/tab', async (importActual) => {
	const actual = await importActual<typeof import('../../components/tabs/tab')>()

	return { ...actual, Tab: vi.fn(actual.Tab) }
})

vi.mock('../../components/nav/use-nav-item', async (importActual) => {
	const actual = await importActual<typeof import('../../components/nav/use-nav-item')>()

	return { ...actual, useNavItem: vi.fn(actual.useNavItem) }
})

const VALUES = Array.from({ length: 30 }, (_, index) => `item-${index}`)

function tabs() {
	return VALUES.map((value) => (
		<Tab key={value} value={value}>
			{value}
		</Tab>
	))
}

function navItems() {
	return VALUES.map((value) => (
		<NavItem key={value} value={value}>
			{value}
		</NavItem>
	))
}

/** Clicks the element with the role and the name, and returns the renders that `count` gives. */
function click(role: 'tab' | 'button', name: string, count: () => number) {
	vi.mocked(Tab).mockClear()

	vi.mocked(useNavItem).mockClear()

	act(() => {
		fireEvent.click(screen.getByRole(role, { name }))
	})

	return count()
}

const tabRenders = () => vi.mocked(Tab).mock.calls.length

const navItemRenders = () => vi.mocked(useNavItem).mock.calls.length

describe('current item renders', () => {
	beforeEach(() => {
		vi.mocked(Tab).mockClear()

		vi.mocked(useNavItem).mockClear()
	})

	it('renders only the two tabs that a switch changes', () => {
		renderUI(
			<Tabs defaultValue="item-0">
				<TabList aria-label="Tabs">{tabs()}</TabList>
			</Tabs>,
		)

		expect(click('tab', 'item-5', tabRenders)).toBe(2)

		expect(screen.getByRole('tab', { name: 'item-5' })).toHaveAttribute('aria-selected', 'true')

		expect(screen.getByRole('tab', { name: 'item-0' })).toHaveAttribute('aria-selected', 'false')
	})

	it('renders only the two tabs that a controlled switch changes', () => {
		function Controlled() {
			const [value, setValue] = useState<string | null>('item-0')

			// Memoized, as a consumer that holds its tab elements does. Without it,
			// each tab renders from its new props, whatever the tabs do.
			const children = useMemo(tabs, [])

			return (
				<Tabs value={value} onValueChange={setValue}>
					<TabList aria-label="Tabs">{children}</TabList>
				</Tabs>
			)
		}

		renderUI(<Controlled />)

		expect(click('tab', 'item-9', tabRenders)).toBe(2)
	})

	it('renders only the two nav items that a change of the current value changes', () => {
		renderUI(
			<Nav defaultValue="item-0">
				<NavList>{navItems()}</NavList>
			</Nav>,
		)

		expect(click('button', 'item-5', navItemRenders)).toBe(2)

		expect(screen.getByRole('button', { name: 'item-5' })).toHaveAttribute('aria-current', 'page')
	})
})
