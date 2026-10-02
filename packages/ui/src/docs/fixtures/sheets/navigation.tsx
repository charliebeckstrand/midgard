import { Bold, Home, Info, Italic, Mail, Underline } from 'lucide-react'
import { Fragment } from 'react'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbSeparator,
} from '../../../components/breadcrumb'
import { Button } from '../../../components/button'
import { Icon } from '../../../components/icon'
import { Kbd } from '../../../components/kbd'
import { Link } from '../../../components/link'
import { NavBar, NavItem, NavList } from '../../../components/nav'
import {
	Pagination,
	PaginationGap,
	PaginationList,
	PaginationNext,
	PaginationPage,
	PaginationPrevious,
} from '../../../components/pagination'
import {
	Stepper,
	StepperDescription,
	StepperSeparator,
	StepperStep,
	StepperTitle,
} from '../../../components/stepper'
import { Tab, TabContent, TabContents, TabList, Tabs } from '../../../components/tabs'
import { Toolbar, ToolbarGroup, ToolbarSeparator } from '../../../components/toolbar'
import { FixtureCase, FixtureGroup, FixtureSheet } from '../fixture'

const TABS = ['Account', 'Notifications', 'Billing'] as const

const STEPS = [
	{ title: 'Account', description: 'Create your account' },
	{ title: 'Profile', description: 'Add your details' },
	{ title: 'Confirm', description: 'Review and submit' },
] as const

const TOOLBAR_VARIANTS = ['plain', 'outline', 'solid'] as const

const NAV_BAR_VARIANTS = ['solid', 'outline', 'plain'] as const

const LINK_COLORS = ['current', 'zinc', 'red', 'amber', 'green', 'blue'] as const

const KBD_SIZES = ['sm', 'md', 'lg'] as const

function Crumbs({ last }: { last: string }) {
	return (
		<Breadcrumb>
			<BreadcrumbList>
				<BreadcrumbItem>
					<BreadcrumbLink href="#home">Home</BreadcrumbLink>
				</BreadcrumbItem>
				<BreadcrumbSeparator />
				<BreadcrumbItem>
					<BreadcrumbLink href="#components">Components</BreadcrumbLink>
				</BreadcrumbItem>
				<BreadcrumbSeparator />
				<BreadcrumbItem>
					<BreadcrumbLink current>{last}</BreadcrumbLink>
				</BreadcrumbItem>
			</BreadcrumbList>
		</Breadcrumb>
	)
}

function TabSet({ variant, label }: { variant?: 'tab' | 'segment'; label: string }) {
	return (
		<Tabs variant={variant} defaultValue="Account">
			<TabList aria-label={label}>
				{TABS.map((tab) => (
					<Tab key={tab} value={tab}>
						{tab}
					</Tab>
				))}
			</TabList>
			<TabContents>
				{TABS.map((tab) => (
					<TabContent key={tab} value={tab}>
						{tab} settings go here.
					</TabContent>
				))}
			</TabContents>
		</Tabs>
	)
}

function Steps({
	orientation,
	described,
}: {
	orientation?: 'horizontal' | 'vertical'
	described?: boolean
}) {
	return (
		<Stepper value={1} orientation={orientation}>
			{STEPS.map((step, index) => (
				<Fragment key={step.title}>
					{index > 0 && <StepperSeparator />}
					<StepperStep value={index}>
						<StepperTitle>{step.title}</StepperTitle>
						{described && <StepperDescription>{step.description}</StepperDescription>}
					</StepperStep>
				</Fragment>
			))}
		</Stepper>
	)
}

function FormatButtons() {
	return (
		<>
			<Button variant="plain" aria-label="Bold" aria-pressed={true}>
				<Icon icon={<Bold />} />
			</Button>
			<Button variant="plain" aria-label="Italic" aria-pressed={false}>
				<Icon icon={<Italic />} />
			</Button>
			<Button variant="plain" aria-label="Underline" aria-pressed={false} disabled>
				<Icon icon={<Underline />} />
			</Button>
		</>
	)
}

export function Sheet() {
	return (
		<FixtureSheet title="Navigation">
			<FixtureGroup title="Breadcrumb">
				<FixtureCase label="default">
					<Crumbs last="Breadcrumb" />
				</FixtureCase>
				<FixtureCase label="long label, full width" wide>
					<Crumbs last="A breadcrumb label that is long enough to wrap onto a second line in the container" />
				</FixtureCase>
			</FixtureGroup>

			<FixtureGroup title="Tabs">
				<FixtureCase label="tab">
					<TabSet label="Settings" />
				</FixtureCase>
				<FixtureCase label="segment">
					<TabSet variant="segment" label="Settings segment" />
				</FixtureCase>
				<FixtureCase label="disabled tab">
					<Tabs defaultValue="Account">
						<TabList aria-label="Settings with a disabled tab">
							<Tab value="Account">Account</Tab>
							<Tab value="Billing" disabled>
								Billing
							</Tab>
						</TabList>
						<TabContents>
							<TabContent value="Account">Account settings go here.</TabContent>
							<TabContent value="Billing">Billing settings go here.</TabContent>
						</TabContents>
					</Tabs>
				</FixtureCase>
				<FixtureCase label="long label, full width" wide>
					<Tabs defaultValue="Sign in" className="w-full">
						<TabList aria-label="Authentication">
							<Tab value="Sign in" stretch>
								Sign in
							</Tab>
							<Tab value="Create account" stretch>
								Create an account with your work email address
							</Tab>
						</TabList>
						<TabContents>
							<TabContent value="Sign in">Sign in with your email and password.</TabContent>
							<TabContent value="Create account">Create an account.</TabContent>
						</TabContents>
					</Tabs>
				</FixtureCase>
			</FixtureGroup>

			<FixtureGroup title="Toolbar">
				{TOOLBAR_VARIANTS.map((variant) => (
					<FixtureCase key={variant} label={variant}>
						<Toolbar variant={variant} aria-label={`${variant} toolbar`}>
							<FormatButtons />
						</Toolbar>
					</FixtureCase>
				))}
				<FixtureCase label="groups">
					<Toolbar variant="outline" aria-label="Text formatting">
						<ToolbarGroup aria-label="Marks">
							<FormatButtons />
						</ToolbarGroup>
						<ToolbarSeparator />
						<ToolbarGroup aria-label="Actions">
							<Button variant="plain">Clear</Button>
						</ToolbarGroup>
					</Toolbar>
				</FixtureCase>
			</FixtureGroup>

			<FixtureGroup title="Stepper">
				<FixtureCase label="horizontal, middle step current" wide>
					<Steps orientation="horizontal" />
				</FixtureCase>
				<FixtureCase label="vertical">
					<Steps orientation="vertical" described />
				</FixtureCase>
				<FixtureCase label="default orientation">
					<Steps />
				</FixtureCase>
				<FixtureCase label="disabled step">
					<Stepper value={0} orientation="vertical">
						<StepperStep value={0}>
							<StepperTitle>Account</StepperTitle>
						</StepperStep>
						<StepperSeparator />
						<StepperStep value={1} disabled>
							<StepperTitle>Profile</StepperTitle>
						</StepperStep>
					</Stepper>
				</FixtureCase>
			</FixtureGroup>

			<FixtureGroup title="Pagination">
				<FixtureCase label="middle page current" wide>
					<Pagination>
						<PaginationPrevious />
						<PaginationList>
							<PaginationPage>1</PaginationPage>
							<PaginationGap />
							{[4, 5, 6].map((page) => (
								<PaginationPage key={page} current={page === 5}>
									{page}
								</PaginationPage>
							))}
							<PaginationGap />
							<PaginationPage>10</PaginationPage>
						</PaginationList>
						<PaginationNext />
					</Pagination>
				</FixtureCase>
				<FixtureCase label="first page, previous disabled">
					<Pagination>
						<PaginationPrevious disabled />
						<PaginationList>
							<PaginationPage current>1</PaginationPage>
							<PaginationPage>2</PaginationPage>
							<PaginationPage>3</PaginationPage>
						</PaginationList>
						<PaginationNext />
					</Pagination>
				</FixtureCase>
			</FixtureGroup>

			<FixtureGroup title="Nav">
				<FixtureCase label="list, vertical">
					<NavList>
						<NavItem current>Home</NavItem>
						<NavItem>About</NavItem>
						<NavItem disabled>Contact</NavItem>
					</NavList>
				</FixtureCase>
				<FixtureCase label="list, horizontal, icons">
					<NavList orientation="horizontal">
						<NavItem icon={<Home />}>Home</NavItem>
						<NavItem icon={<Info />} current>
							About
						</NavItem>
						<NavItem icon={<Mail />}>Contact</NavItem>
					</NavList>
				</FixtureCase>
				{NAV_BAR_VARIANTS.map((variant) => (
					<FixtureCase key={variant} label={`bar, ${variant}`}>
						<NavBar variant={variant} aria-label={`${variant} bar`}>
							<NavList>
								<NavItem current>Home</NavItem>
								<NavItem>About</NavItem>
								<NavItem>Contact</NavItem>
							</NavList>
						</NavBar>
					</FixtureCase>
				))}
				<FixtureCase label="long label, full width" wide>
					<NavList className="w-full">
						<NavItem current>
							A navigation label that is long enough to wrap or to stretch the container
						</NavItem>
						<NavItem>Short</NavItem>
					</NavList>
				</FixtureCase>
			</FixtureGroup>

			<FixtureGroup title="Link">
				<FixtureCase label="color">
					{LINK_COLORS.map((color) => (
						<Link key={color} href={`#${color}`} color={color}>
							{color}
						</Link>
					))}
				</FixtureCase>
				<FixtureCase label="underline">
					<Link href="#underline" underline>
						Underline on hover
					</Link>
				</FixtureCase>
				<FixtureCase label="inline with text">
					<p className="text-sm">
						For more, see the{' '}
						<Link href="#guide" color="blue">
							getting started guide
						</Link>
						.
					</p>
				</FixtureCase>
			</FixtureGroup>

			<FixtureGroup title="Kbd">
				<FixtureCase label="default">
					<Kbd>⌘K</Kbd>
					<Kbd>⌃⌘K</Kbd>
					<Kbd>Esc</Kbd>
				</FixtureCase>
				<FixtureCase label="size">
					{KBD_SIZES.map((size) => (
						<Kbd key={size} size={size}>
							{size}
						</Kbd>
					))}
				</FixtureCase>
				<FixtureCase label="inside a button">
					<Button suffix={<Kbd>⌘O</Kbd>}>Open</Button>
					<Button variant="outline" suffix={<Kbd>⌘S</Kbd>}>
						Save
					</Button>
				</FixtureCase>
			</FixtureGroup>
		</FixtureSheet>
	)
}
