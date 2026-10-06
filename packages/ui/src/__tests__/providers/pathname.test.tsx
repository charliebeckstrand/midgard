import { describe, expect, it } from 'vitest'
import { Nav, NavItem, NavList } from '../../components/nav'
import { Sidebar, SidebarItem, SidebarList } from '../../components/sidebar'
import { UIProvider } from '../../providers/ui'
import { renderUI, screen } from '../helpers'

/** The `aria-current` of the link with the name. */
function currentOf(name: string) {
	return screen.getByRole('link', { name }).getAttribute('aria-current')
}

describe('UIProvider pathname', () => {
	it('marks the sidebar item whose href is the pathname', () => {
		renderUI(
			<UIProvider pathname="/users">
				<Sidebar>
					<SidebarList>
						<SidebarItem href="/">Home</SidebarItem>
						<SidebarItem href="/users">Users</SidebarItem>
					</SidebarList>
				</Sidebar>
			</UIProvider>,
		)

		expect(currentOf('Users')).toBe('page')

		expect(currentOf('Home')).toBeNull()
	})

	it('matches each path under the href with match="prefix", at a segment boundary', () => {
		renderUI(
			<UIProvider pathname="/users/42">
				<Nav>
					<NavList>
						<NavItem href="/users" match="prefix">
							Users
						</NavItem>
						<NavItem href="/use" match="prefix">
							Use
						</NavItem>
						<NavItem href="/users">Exact</NavItem>
					</NavList>
				</Nav>
			</UIProvider>,
		)

		expect(currentOf('Users')).toBe('page')

		expect(currentOf('Use')).toBeNull()

		expect(currentOf('Exact')).toBeNull()
	})

	it('lets an explicit current win over the pathname', () => {
		renderUI(
			<UIProvider pathname="/users">
				<Sidebar>
					<SidebarItem href="/users" current={false}>
						Users
					</SidebarItem>
				</Sidebar>
			</UIProvider>,
		)

		expect(currentOf('Users')).toBeNull()
	})

	it('keeps the pathname of the outer provider when a nested provider omits it', () => {
		renderUI(
			<UIProvider pathname="/users">
				<UIProvider link="a">
					<Sidebar>
						<SidebarItem href="/users">Users</SidebarItem>
					</Sidebar>
				</UIProvider>
			</UIProvider>,
		)

		expect(currentOf('Users')).toBe('page')
	})

	it('moves the current item when the pathname changes', () => {
		function Items({ pathname }: { pathname: string }) {
			return (
				<UIProvider pathname={pathname}>
					<Sidebar>
						<SidebarList>
							<SidebarItem href="/users">Users</SidebarItem>
							<SidebarItem href="/security">Security</SidebarItem>
						</SidebarList>
					</Sidebar>
				</UIProvider>
			)
		}

		const { rerender } = renderUI(<Items pathname="/users" />)

		rerender(<Items pathname="/security" />)

		expect(currentOf('Security')).toBe('page')

		expect(currentOf('Users')).toBeNull()
	})

	it('marks no item outside a provider with a pathname', () => {
		renderUI(
			<Sidebar>
				<SidebarItem href="/users">Users</SidebarItem>
			</Sidebar>,
		)

		expect(currentOf('Users')).toBeNull()
	})
})
