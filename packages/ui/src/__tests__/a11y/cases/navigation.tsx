import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbSeparator,
} from '../../../components/breadcrumb'
import { Button } from '../../../components/button'
import { Link } from '../../../components/link'
import { NavBar, NavItem, NavList } from '../../../components/nav'
import {
	Pagination,
	PaginationList,
	PaginationNext,
	PaginationPage,
	PaginationPrevious,
} from '../../../components/pagination'
import {
	Sidebar,
	SidebarBody,
	SidebarItem,
	SidebarLabel,
	SidebarList,
} from '../../../components/sidebar'
import { Stepper, StepperSeparator, StepperStep, StepperTitle } from '../../../components/stepper'
import { Tab, TabContent, TabContents, TabList, Tabs } from '../../../components/tabs'
import { Toolbar, ToolbarSeparator } from '../../../components/toolbar'
import type { Case } from './types'

/** Navigation surfaces: links, tablists, steppers, and toolbars. */
export const navigationCases: readonly Case[] = [
	[
		'link',
		<Link key="lk" href="#docs">
			Read the documentation
		</Link>,
	],
	[
		// Previous/Next sit outside the <ol>; they are not list items.
		'pagination',
		<Pagination key="p">
			<PaginationPrevious />
			<PaginationList>
				<PaginationPage current>1</PaginationPage>
				<PaginationPage>2</PaginationPage>
			</PaginationList>
			<PaginationNext />
		</Pagination>,
	],
	[
		// Navigation, not a menu: links with aria-current, no menubar/menuitem.
		'nav-bar',
		<NavBar key="nb">
			<NavList>
				<NavItem href="#home" current>
					Home
				</NavItem>
				<NavItem href="#about">About</NavItem>
			</NavList>
		</NavBar>,
	],
	[
		// Sidebar navigation: items wrapped in a SidebarList <ul> that exposes
		// count/position; the list is named after its heading.
		'sidebar',
		<Sidebar key="sb">
			<SidebarBody>
				<SidebarList aria-label="Primary">
					<SidebarItem href="#home" current>
						<SidebarLabel>Home</SidebarLabel>
					</SidebarItem>
					<SidebarItem href="#inbox">
						<SidebarLabel>Inbox</SidebarLabel>
					</SidebarItem>
				</SidebarList>
			</SidebarBody>
		</Sidebar>,
	],
	[
		'breadcrumb',
		<Breadcrumb key="b">
			<BreadcrumbList>
				<BreadcrumbItem>
					<BreadcrumbLink href="#home">Home</BreadcrumbLink>
				</BreadcrumbItem>
				<BreadcrumbSeparator />
				<BreadcrumbItem>
					<BreadcrumbLink current>Current</BreadcrumbLink>
				</BreadcrumbItem>
			</BreadcrumbList>
		</Breadcrumb>,
	],
	[
		// tablist/tab/tabpanel: the selected tab is named and its panel labelled by
		// the tab via aria-labelledby.
		'tabs',
		<Tabs key="t" defaultValue="account">
			<TabList aria-label="Sections">
				<Tab value="account">Account</Tab>
				<Tab value="billing">Billing</Tab>
			</TabList>
			<TabContents>
				<TabContent value="account">Account settings.</TabContent>
				<TabContent value="billing">Billing settings.</TabContent>
			</TabContents>
		</Tabs>,
	],
	[
		// Process steps with separators between them; current step marked via the
		// active value.
		'stepper',
		<Stepper key="st" value={1}>
			<StepperStep value={0}>
				<StepperTitle>Account</StepperTitle>
			</StepperStep>
			<StepperSeparator />
			<StepperStep value={1}>
				<StepperTitle>Profile</StepperTitle>
			</StepperStep>
			<StepperSeparator />
			<StepperStep value={2}>
				<StepperTitle>Confirm</StepperTitle>
			</StepperStep>
		</Stepper>,
	],
	[
		// role=toolbar with an accessible name; grouped controls named by their
		// text.
		'toolbar',
		<Toolbar key="tb" aria-label="Text formatting">
			<Button variant="plain">Bold</Button>
			<Button variant="plain">Italic</Button>
			<ToolbarSeparator />
			<Button variant="plain">Underline</Button>
		</Toolbar>,
	],
]
