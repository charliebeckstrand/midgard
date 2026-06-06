import { type ReactElement, useEffect } from 'react'
import {
	Accordion,
	AccordionItem,
	AccordionPanel,
	AccordionTrigger,
} from '../../components/accordion'
import { Alert } from '../../components/alert'
import { Badge } from '../../components/badge'
import { BottomNav, BottomNavItem } from '../../components/bottom-nav'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbSeparator,
} from '../../components/breadcrumb'
import { Button } from '../../components/button'
import { Calendar } from '../../components/calendar'
import { Checkbox, CheckboxField, CheckboxGroup } from '../../components/checkbox'
import { Combobox, ComboboxLabel, ComboboxOption } from '../../components/combobox'
import {
	CommandPalette,
	CommandPaletteGroup,
	CommandPaletteItem,
	CommandPaletteLabel,
} from '../../components/command-palette'
import { Confirm } from '../../components/confirm'
import { DataTable, type DataTableColumn } from '../../components/data-table'
import { DatePicker } from '../../components/date-picker'
import { Dialog, DialogBody, DialogTitle } from '../../components/dialog'
import { Drawer, DrawerBody, DrawerTitle } from '../../components/drawer'
import { Field, Label } from '../../components/fieldset'
import { FileUpload } from '../../components/file-upload'
import { Heading } from '../../components/heading'
import { Input } from '../../components/input'
import { Listbox, ListboxLabel, ListboxOption } from '../../components/listbox'
import {
	Menu,
	MenuContent,
	MenuItem,
	MenuLabel,
	MenuSection,
	MenuTrigger,
} from '../../components/menu'
import { NavItem, NavList } from '../../components/nav'
import { Navbar } from '../../components/navbar'
import {
	Pagination,
	PaginationList,
	PaginationNext,
	PaginationPage,
	PaginationPrevious,
} from '../../components/pagination'
import { Popover, PopoverContent, PopoverTrigger } from '../../components/popover'
import { ProgressBar } from '../../components/progress'
import { Radio, RadioField, RadioGroup } from '../../components/radio'
import { Segment, SegmentControl, SegmentItem } from '../../components/segment'
import { Select, SelectLabel, SelectOption } from '../../components/select'
import { Sheet, SheetBody, SheetTitle } from '../../components/sheet'
import {
	Sidebar,
	SidebarBody,
	SidebarItem,
	SidebarLabel,
	SidebarList,
} from '../../components/sidebar'
import { Slider } from '../../components/slider'
import { Spinner } from '../../components/spinner'
import { StatusDot } from '../../components/status'
import { Stepper, StepperSeparator, StepperStep, StepperTitle } from '../../components/stepper'
import { Switch, SwitchField } from '../../components/switch'
import { Tab, TabContent, TabContents, TabList, Tabs } from '../../components/tabs'
import { TagInput } from '../../components/tag-input'
import { Text } from '../../components/text'
import { Textarea } from '../../components/textarea'
import { Toast } from '../../components/toast'
import { ToggleIconButton } from '../../components/toggle-icon-button'
import { Toolbar, ToolbarSeparator } from '../../components/toolbar'
import { Tree, TreeItem } from '../../components/tree'
import { ToastProvider, useToast } from '../../providers/toast'

export type Case = readonly [name: string, element: ReactElement]

type Person = { id: number; name: string; email: string }

const dataTableRows: Person[] = [
	{ id: 1, name: 'Wade Cooper', email: 'wade@example.com' },
	{ id: 2, name: 'Arlene McCoy', email: 'arlene@example.com' },
]

const dataTableColumns: DataTableColumn<Person>[] = [
	{ id: 'name', title: 'Name', cell: (row) => row.name, sortable: true },
	{ id: 'email', title: 'Email', cell: (row) => row.email },
]

/**
 * Canonical, correctly-wired render of each component — the corpus the
 * compliance gate (`baseline.test.tsx`) asserts is axe-clean. This is where
 * "all components are a11y-compliant" is enforced: add every component here in
 * its canonical, correctly-labelled form as it is verified clean.
 */
export const baseline: readonly Case[] = [
	['badge', <Badge key="b">New</Badge>],
	['button', <Button key="b">Save</Button>],
	['spinner', <Spinner key="s" />],
	[
		'heading + text',
		<div key="h">
			<Heading level={1}>Title</Heading>
			<Text>Body copy.</Text>
		</div>,
	],
	[
		'alert',
		<Alert key="a" severity="success" title="Saved" description="Your changes are live." />,
	],
	[
		'input in field',
		<Field key="f">
			<Label htmlFor="axe-name">Name</Label>
			<Input id="axe-name" />
		</Field>,
	],
	[
		'textarea in field',
		<Field key="f">
			<Label htmlFor="axe-bio">Bio</Label>
			<Textarea id="axe-bio" />
		</Field>,
	],
	[
		// No explicit id: the Field generates one, the Label and Slider both read
		// it from Control context, so the label names the range input.
		'slider in field',
		<Field key="f">
			<Label>Volume</Label>
			<Slider defaultValue={50} />
		</Field>,
	],
	['file upload (area)', <FileUpload key="fu" variant="area" />],
	['file upload (button)', <FileUpload key="fu" variant="button" />],
	[
		// Previous/Next sit outside the <ol>, so they must not be list items.
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
		'navbar',
		<Navbar key="nb">
			<NavList>
				<NavItem href="#home" current>
					Home
				</NavItem>
				<NavItem href="#about">About</NavItem>
			</NavList>
		</Navbar>,
	],
	[
		// Sidebar navigation: items wrapped in a SidebarList <ul> so the set
		// exposes count/position; the list is named after its heading.
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
		'bottom nav',
		<BottomNav key="bn">
			<BottomNavItem href="#home" icon={<svg aria-hidden="true" />} current>
				Home
			</BottomNavItem>
			<BottomNavItem href="#search" icon={<svg aria-hidden="true" />}>
				Search
			</BottomNavItem>
		</BottomNav>,
	],
	[
		'checkbox',
		<CheckboxGroup key="c">
			<CheckboxField>
				<Checkbox />
				<Label>Accept terms and conditions</Label>
			</CheckboxField>
		</CheckboxGroup>,
	],
	[
		'switch',
		<SwitchField key="s">
			<Label>Notifications</Label>
			<Switch />
		</SwitchField>,
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
		// Disclosure pattern: each trigger is a button that controls its panel via
		// aria-expanded/aria-controls; one item open by default.
		'accordion',
		<Accordion key="ac" defaultValue="shipping">
			<AccordionItem value="shipping">
				<AccordionTrigger>Shipping</AccordionTrigger>
				<AccordionPanel>Orders ship within one business day.</AccordionPanel>
			</AccordionItem>
			<AccordionItem value="returns">
				<AccordionTrigger>Returns</AccordionTrigger>
				<AccordionPanel>Unworn items can be returned within 30 days.</AccordionPanel>
			</AccordionItem>
		</Accordion>,
	],
	[
		// tablist/tab/tabpanel: the selected tab is named and its panel labelled by
		// the tab via aria-labelledby.
		'tabs',
		<Tabs key="t" defaultValue="account">
			<TabList>
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
		// Radios share a name to form a single group; each input is named by its
		// adjacent Label through Control context.
		'radio',
		<RadioGroup key="r">
			<RadioField>
				<Radio name="plan" value="starter" defaultChecked />
				<Label>Starter</Label>
			</RadioField>
			<RadioField>
				<Radio name="plan" value="business" />
				<Label>Business</Label>
			</RadioField>
		</RadioGroup>,
	],
	[
		// Single-select segmented control (radiogroup); the group carries an
		// accessible name and one item is selected.
		'segment',
		<Segment key="sg" defaultValue="list" aria-label="View">
			<SegmentControl>
				<SegmentItem value="list">List</SegmentItem>
				<SegmentItem value="grid">Grid</SegmentItem>
			</SegmentControl>
		</Segment>,
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
		// Status indicator paired with a visible text label so meaning is not
		// conveyed by the dot alone.
		'status',
		<span key="sd">
			<StatusDot status="active" /> Active
		</span>,
	],
	[
		// Determinate progressbar named via aria-label (no associated visible
		// label in this canonical form).
		'progress',
		<ProgressBar key="pb" value={60} aria-label="Upload progress" />,
	],
	[
		// Icon-only toggle: aria-pressed reflects state, aria-label supplies the
		// accessible name the icon cannot.
		'toggle icon button',
		<ToggleIconButton
			key="tib"
			pressed={false}
			icon={<svg aria-hidden="true" />}
			pressedIcon={<svg aria-hidden="true" />}
			aria-label="Toggle dark mode"
		/>,
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
	[
		// Tags edited inline; the composite is named by its Field Label through
		// Control context.
		'tag input',
		<Field key="ti">
			<Label>Tags</Label>
			<TagInput defaultValue={['React', 'TypeScript']} placeholder="Add a tag" />
		</Field>,
	],
	[
		// role=tree with nested role=group; each item exposes its label and
		// expanded state.
		'tree',
		<Tree key="tr">
			<TreeItem label="Documents">
				<TreeItem label="report.pdf" />
				<TreeItem label="budget.xlsx" />
			</TreeItem>
			<TreeItem label="Photos">
				<TreeItem label="vacation.jpg" />
			</TreeItem>
		</Tree>,
	],
	[
		// Closed listbox: the trigger is a button named by its Field Label; the
		// option popover only mounts when opened.
		'listbox in field',
		<Field key="lb">
			<Label>Status</Label>
			<Listbox<string> nullable displayValue={(value: string) => value} placeholder="Select status">
				<ListboxOption value="active">
					<ListboxLabel>Active</ListboxLabel>
				</ListboxOption>
				<ListboxOption value="paused">
					<ListboxLabel>Paused</ListboxLabel>
				</ListboxOption>
			</Listbox>
		</Field>,
	],
	[
		// Data grid with a sortable column header (aria-sort) and keyed rows.
		'data table',
		<DataTable key="dt" columns={dataTableColumns} rows={dataTableRows} getKey={(row) => row.id} />,
	],
	['calendar', <Calendar key="ca" />],
	[
		// Closed select: the trigger is a button named by its Field Label; the
		// option popover only mounts when opened (covered in the overlays corpus).
		'select in field',
		<Field key="sl">
			<Label>Country</Label>
			<Select placeholder="Select a country" displayValue={(value: string) => value}>
				<SelectOption value="United States">
					<SelectLabel>United States</SelectLabel>
				</SelectOption>
				<SelectOption value="Canada">
					<SelectLabel>Canada</SelectLabel>
				</SelectOption>
			</Select>
		</Field>,
	],
	[
		// Closed date picker: the trigger is named by its Field Label; the calendar
		// popover only mounts when opened.
		'date picker in field',
		<Field key="dp">
			<Label>Start date</Label>
			<DatePicker />
		</Field>,
	],
	[
		// Closed combobox: role=combobox input named by its Field Label, aria-expanded
		// false; the option listbox only mounts when opened. (The open listbox is a
		// known finding — see overlays corpus note.)
		'combobox in field',
		<Field key="cb">
			<Label>Assignee</Label>
			<Combobox displayValue={(value: string) => value} placeholder="Select a person">
				{() => (
					<ComboboxOption value="Wade Cooper">
						<ComboboxLabel>Wade Cooper</ComboboxLabel>
					</ComboboxOption>
				)}
			</Combobox>
		</Field>,
	],
]

const noop = () => {}

/**
 * Mounts a `ToastProvider`, enqueues one toast on mount, and renders the
 * portalled viewport — the only way to exercise a live toast's role/name wiring
 * statically. Used by the overlays corpus.
 */
function ToastCase() {
	const { toast } = useToast()

	useEffect(() => {
		toast({ title: 'Saved', description: 'Your changes have been saved.', severity: 'success' })
	}, [toast])

	return <Toast />
}

/**
 * Overlay corpus — components whose content is portalled to `document.body`, so
 * the gate (`baseline.test.tsx`) must render them open and assert against the
 * document, not the render container. Each case is authored in its canonical
 * open state via a controlled `open`/`defaultOpen` prop.
 */
export const overlays: readonly Case[] = [
	[
		// Modal dialog: named by its title via aria-labelledby; aria-modal set.
		'dialog',
		<Dialog key="d" open onOpenChange={noop}>
			<DialogTitle>Create project</DialogTitle>
			<DialogBody>Enter the details for your new project.</DialogBody>
		</Dialog>,
	],
	[
		// Bottom drawer: a modal surface named by its title.
		'drawer',
		<Drawer key="dr" open onOpenChange={noop}>
			<DrawerTitle>Drawer</DrawerTitle>
			<DrawerBody>Slides up from the bottom.</DrawerBody>
		</Drawer>,
	],
	[
		// Side sheet: a modal surface named by its title.
		'sheet',
		<Sheet key="sh" open onOpenChange={noop}>
			<SheetTitle>Right Sheet</SheetTitle>
			<SheetBody>Slides in from the right.</SheetBody>
		</Sheet>,
	],
	[
		// Confirmation dialog: named by its title, with confirm/cancel actions.
		'confirm',
		<Confirm
			key="cf"
			open
			onOpenChange={noop}
			onConfirm={noop}
			title="Discard changes?"
			description="You have unsaved changes that will be lost."
			confirm={{ label: 'Discard changes', color: 'amber' }}
			cancel={{ label: 'Keep editing' }}
		/>,
	],
	[
		// Non-modal popover anchored to its trigger button.
		'popover',
		<Popover key="po" open>
			<PopoverTrigger>
				<Button variant="outline">Open popover</Button>
			</PopoverTrigger>
			<PopoverContent>This is a general-purpose floating container.</PopoverContent>
		</Popover>,
	],
	[
		// Dropdown menu: role=menu with grouped menuitems, opened on mount.
		'menu',
		<Menu key="mn" defaultOpen>
			<MenuTrigger>
				<Button variant="outline">Options</Button>
			</MenuTrigger>
			<MenuContent>
				<MenuSection>
					<MenuItem>
						<MenuLabel>Edit</MenuLabel>
					</MenuItem>
					<MenuItem>
						<MenuLabel>Duplicate</MenuLabel>
					</MenuItem>
				</MenuSection>
			</MenuContent>
		</Menu>,
	],
	[
		// Command palette: a modal search dialog over a grouped result list.
		'command palette',
		<CommandPalette key="cp" open onOpenChange={noop}>
			{() => (
				<CommandPaletteGroup title="Files">
					<CommandPaletteItem>
						<CommandPaletteLabel>New file</CommandPaletteLabel>
					</CommandPaletteItem>
					<CommandPaletteItem>
						<CommandPaletteLabel>Open file</CommandPaletteLabel>
					</CommandPaletteItem>
				</CommandPaletteGroup>
			)}
		</CommandPalette>,
	],
	[
		// Live toast: each toast carries its own status/alert role for politeness.
		'toast',
		<ToastProvider key="ts">
			<ToastCase />
		</ToastProvider>,
	],
]
