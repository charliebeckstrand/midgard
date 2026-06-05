import type { ReactElement } from 'react'
import { describe, it } from 'vitest'
import { Heading } from '../../components/heading'
import {
	Sidebar,
	SidebarBody,
	SidebarItem,
	SidebarLabel,
	SidebarSection,
} from '../../components/sidebar'
import { Text } from '../../components/text'
import {
	AuthLayout,
	DashboardLayout,
	SidebarLayout,
	SidebarLayoutBody,
	SidebarLayoutHeader,
	StackedLayout,
	StackedLayoutBody,
	StackedLayoutFooter,
	StackedLayoutHeader,
} from '../../layouts'
import { axePage, renderUI } from '../helpers'

/**
 * Page/layout landmark compliance. Unlike the component gate, this renders whole
 * layouts and runs axe at document scope (`axePage` enables `region` and the
 * landmark rules) so the structural concerns that only exist at the page level —
 * a single <main>, content contained in landmarks, uniquely-labelled landmarks —
 * are actually exercised. Each page is rendered in its canonical, complete form.
 */

const sidebar = (
	<Sidebar>
		<SidebarBody>
			<SidebarSection>
				<SidebarItem href="#dashboard" current>
					<SidebarLabel>Dashboard</SidebarLabel>
				</SidebarItem>
				<SidebarItem href="#settings">
					<SidebarLabel>Settings</SidebarLabel>
				</SidebarItem>
			</SidebarSection>
		</SidebarBody>
	</Sidebar>
)

const pages: readonly [name: string, page: ReactElement][] = [
	[
		'auth layout',
		<AuthLayout key="a">
			<Heading level={1}>Sign in</Heading>
			<Text>Welcome back.</Text>
		</AuthLayout>,
	],
	[
		'stacked layout',
		<StackedLayout key="s">
			<StackedLayoutHeader>
				<Heading level={1}>Dashboard</Heading>
			</StackedLayoutHeader>
			<StackedLayoutBody>
				<Text>Body content.</Text>
			</StackedLayoutBody>
			<StackedLayoutFooter>
				<Text>© 2026 Midgard</Text>
			</StackedLayoutFooter>
		</StackedLayout>,
	],
	[
		'dashboard layout',
		<DashboardLayout key="d" filters={<Text>Filters</Text>}>
			<Heading level={1}>Orders</Heading>
			<Text>Order content.</Text>
		</DashboardLayout>,
	],
	[
		'sidebar layout',
		<SidebarLayout key="sb" sidebar={sidebar}>
			<SidebarLayoutHeader>
				<Heading level={1}>Project kickoff</Heading>
			</SidebarLayoutHeader>
			<SidebarLayoutBody>
				<Text>Conversation content.</Text>
			</SidebarLayoutBody>
		</SidebarLayout>,
	],
]

describe('a11y landmarks (axe, page scope)', () => {
	it.each(pages)('%s composes a valid landmark structure', async (_name, page) => {
		renderUI(page)

		expect(await axePage(document.body)).toHaveNoViolations()
	})
})
