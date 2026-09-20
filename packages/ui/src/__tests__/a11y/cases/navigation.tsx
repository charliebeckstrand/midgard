import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbSeparator,
	BreadcrumbSkeleton,
} from '../../../components/breadcrumb'
import { Button } from '../../../components/button'
import { Link } from '../../../components/link'
import { Nav, NavBar, NavItem, NavList } from '../../../components/nav'
import {
	Pagination,
	PaginationList,
	PaginationNext,
	PaginationPage,
	PaginationPrevious,
	PaginationSkeleton,
} from '../../../components/pagination'
import {
	Sidebar,
	SidebarBody,
	SidebarItem,
	SidebarLabel,
	SidebarList,
} from '../../../components/sidebar'
import {
	Stepper,
	StepperSeparator,
	StepperSkeleton,
	StepperStep,
	StepperTitle,
} from '../../../components/stepper'
import {
	Tab,
	TabContent,
	TabContents,
	TabList,
	TabListSkeleton,
	Tabs,
} from '../../../components/tabs'
import { Toolbar, ToolbarSeparator } from '../../../components/toolbar'
import type { Case } from './types'

/** Navigation surfaces: links, tablists, steppers, and toolbars. */
export const navigationCases: readonly Case[] = [
	{
		name: 'link',
		element: (
			<Link key="lk" href="#docs">
				Read the documentation
			</Link>
		),
	},
	{
		// Previous/Next sit outside the <ol>; they are not list items.
		name: 'pagination',
		element: (
			<Pagination key="p">
				<PaginationPrevious />
				<PaginationList>
					<PaginationPage current>1</PaginationPage>
					<PaginationPage>2</PaginationPage>
				</PaginationList>
				<PaginationNext />
			</Pagination>
		),
		skeleton: [
			{
				element: <PaginationSkeleton pages={5} />,
				absentSlot: 'pagination',
				placeholders: 5,
			},
		],
	},
	{
		// Navigation, not a menu: links with aria-current, no menubar/menuitem.
		name: 'nav-bar',
		element: (
			<NavBar key="nb">
				<NavList>
					<NavItem href="#home" current>
						Home
					</NavItem>
					<NavItem href="#about">About</NavItem>
				</NavList>
			</NavBar>
		),
		passthrough: [
			{
				render: (props) => (
					<Nav {...props}>
						<NavList>content</NavList>
					</Nav>
				),
				slot: 'nav',
			},
			{ render: (props) => <NavBar {...props}>content</NavBar>, slot: 'nav-bar' },
		],
	},
	{
		// Sidebar navigation: items wrapped in a SidebarList <ul> that exposes
		// count/position; the list is named after its heading.
		name: 'sidebar',
		element: (
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
			</Sidebar>
		),
	},
	{
		name: 'breadcrumb',
		element: (
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
			</Breadcrumb>
		),
		skeleton: [
			{
				// Three crumb lines and two separators between them.
				element: <BreadcrumbSkeleton crumbs={3} />,
				absentSlot: 'breadcrumb',
				placeholders: 5,
			},
		],
	},
	{
		// tablist/tab/tabpanel: the selected tab is named and its panel labelled by
		// the tab via aria-labelledby.
		name: 'tabs',
		element: (
			<Tabs key="t" defaultValue="account">
				<TabList aria-label="Sections">
					<Tab value="account">Account</Tab>
					<Tab value="billing">Billing</Tab>
				</TabList>
				<TabContents>
					<TabContent value="account">Account settings.</TabContent>
					<TabContent value="billing">Billing settings.</TabContent>
				</TabContents>
			</Tabs>
		),
		skeleton: [
			{
				element: <TabListSkeleton tabs={4} />,
				absentSlot: 'tab',
				placeholders: 4,
			},
		],
	},
	{
		// Process steps with separators between them; current step marked via the
		// active value.
		name: 'stepper',
		element: (
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
			</Stepper>
		),
		skeleton: [
			{
				// One indicator dot and one title line per step.
				element: <StepperSkeleton steps={3} />,
				absentSlot: 'stepper',
				placeholders: 6,
			},
		],
	},
	{
		// role=toolbar with an accessible name; grouped controls named by their
		// text.
		name: 'toolbar',
		element: (
			<Toolbar key="tb" aria-label="Text formatting">
				<Button variant="plain">Bold</Button>
				<Button variant="plain">Italic</Button>
				<ToolbarSeparator />
				<Button variant="plain">Underline</Button>
			</Toolbar>
		),
	},
]
