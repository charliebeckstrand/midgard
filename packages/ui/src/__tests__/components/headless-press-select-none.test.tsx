import { describe, expect, it } from 'vitest'
import { Nav, NavItem, NavList } from '../../components/nav'
import { Sidebar, SidebarItem } from '../../components/sidebar'
import { Tab, TabList, Tabs } from '../../components/tabs'
import { renderUI, screen } from '../helpers'

/**
 * A press target built on a headless Button keeps the `select-none` of a button.
 *
 * Tab, NavItem, and SidebarItem render a `<Button>` under a `HeadlessProvider`, which drops the
 * button recipe and its `select-none *:select-none`. A long press on iOS then selected the label
 * text. iOS Safari can select the text in a child of a `select-none` element, so the children
 * also set it.
 */
describe('a headless press target under a long press', () => {
	function expectNoSelection(element: HTMLElement) {
		expect(element).toHaveClass('select-none', '*:select-none')
	}

	it('keeps a Tab from selecting its label', () => {
		renderUI(
			<Tabs value="a" onValueChange={() => {}}>
				<TabList aria-label="Sections">
					<Tab value="a">Alpha</Tab>
				</TabList>
			</Tabs>,
		)

		expectNoSelection(screen.getByRole('tab', { name: 'Alpha' }))
	})

	it('keeps a NavItem from selecting its label', () => {
		renderUI(
			<Nav>
				<NavList>
					<NavItem>Home</NavItem>
				</NavList>
			</Nav>,
		)

		expectNoSelection(screen.getByRole('button', { name: 'Home' }))
	})

	it('keeps a SidebarItem from selecting its label', () => {
		renderUI(
			<Sidebar>
				<SidebarItem>Settings</SidebarItem>
			</Sidebar>,
		)

		expectNoSelection(screen.getByRole('button', { name: 'Settings' }))
	})
})
