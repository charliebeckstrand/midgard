import { cleanup } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { AddressInput } from '../../../components/address-input'
import { Avatar, AvatarGroup, AvatarSkeleton } from '../../../components/avatar'
import { Badge, BadgeSkeleton } from '../../../components/badge'
import { Button, ButtonSkeleton } from '../../../components/button'
import { Calendar, CalendarRange, CalendarSkeleton } from '../../../components/calendar'
import { Card, CardTitle } from '../../../components/card'
import { Checkbox, CheckboxSkeleton } from '../../../components/checkbox'
import { Code, CodeBlock } from '../../../components/code'
import {
	ColorPanel,
	ColorPanelSkeleton,
	ColorPicker,
	ColorPickerSkeleton,
} from '../../../components/color'
import { Combobox, ComboboxLabel, ComboboxOption } from '../../../components/combobox'
import {
	CommandPalette,
	CommandPaletteClose,
	CommandPaletteShortcut,
} from '../../../components/command-palette'
import { Control, ControlSkeleton } from '../../../components/control'
import { CopyButton } from '../../../components/copy-button'
import {
	CreditCardInput,
	CreditCardInputCvv,
	CreditCardInputExpiry,
} from '../../../components/credit-card-input'
import { CurrencyInput } from '../../../components/currency-input'
import { DateInput } from '../../../components/date-input'
import { DatePicker, DatePickerSkeleton } from '../../../components/date-picker'
import { Drawer, DrawerBody, DrawerPanel, DrawerTitle } from '../../../components/drawer'
import { FileUploadButton, FileUploadInput } from '../../../components/file-upload'
import { Group } from '../../../components/group'
import { Heading, HeadingSkeleton } from '../../../components/heading'
import { HoldButton } from '../../../components/hold-button'
import { Icon } from '../../../components/icon'
import { Input } from '../../../components/input'
import { Kbd } from '../../../components/kbd'
import { Listbox, ListboxLabel, ListboxOption } from '../../../components/listbox'
import { LoadingDots, LoadingSpinner } from '../../../components/loading'
import { MaskInput, phoneMask } from '../../../components/mask-input'
import { Menu, MenuContent, MenuItem, MenuShortcut, MenuTrigger } from '../../../components/menu'
import { NumberInput } from '../../../components/number-input'
import { PaginationNext, PaginationPrevious } from '../../../components/pagination'
import {
	PasswordConfirm,
	PasswordConfirmNew,
	PasswordConfirmRepeat,
} from '../../../components/password-confirm'
import { PasswordInput } from '../../../components/password-input'
import { PivotTable } from '../../../components/pivot-table'
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/popover'
import {
	ProgressBar,
	ProgressBarSkeleton,
	ProgressGauge,
	ProgressGaugeSkeleton,
} from '../../../components/progress'
import { Radio, RadioGroup, RadioSkeleton } from '../../../components/radio'
import { Rating, RatingSkeleton } from '../../../components/rating'
import { SearchInput } from '../../../components/search-input'
import { Segment, SegmentControl, SegmentItem, SegmentSkeleton } from '../../../components/segment'
import { Select, SelectLabel, SelectOption } from '../../../components/select'
import { SidebarItem, SidebarSkeleton } from '../../../components/sidebar'
import { RangeSlider, Slider, SliderSkeleton } from '../../../components/slider'
import { Sparkline, SparklineSkeleton } from '../../../components/sparkline'
import { StatSkeleton, StatValue, StatValueSkeleton } from '../../../components/stat'
import { StatusDot } from '../../../components/status'
import { Swatch } from '../../../components/swatch'
import { Switch, SwitchSkeleton } from '../../../components/switch'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '../../../components/table'
import { Tab, TabList, TabListSkeleton, Tabs } from '../../../components/tabs'
import { TagInput } from '../../../components/tag-input'
import { Text, TextSkeleton } from '../../../components/text'
import { Textarea, TextareaSkeleton } from '../../../components/textarea'
import { ToggleIconButton, ToggleIconButtonSkeleton } from '../../../components/toggle-icon-button'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../components/tooltip'
import { Tree, TreeItem, TreeSkeleton } from '../../../components/tree'
import type { DensityStep } from '../../../core/density'
import { ChartSkeleton } from '../../../modules/chart'
import { Grid, type GridColumn } from '../../../modules/grid'
import { renderUI } from '../../helpers'
import { SIZE_AXES, type SizedComponent } from '../../helpers/size-axes'
import { settledValue } from '../helpers/sample'
import { budget } from '../helpers/wall-clock'

/**
 * The distinct-steps gate. Each step that a `size` prop offers must render
 * with a look of its own. The gate renders each step of each axis in
 * `SIZE_AXES`, and reads the box, the text, the padding, the gap, and the
 * radius of each element on the page. Two neighbor steps with the same reading
 * are one look under two names, so the prop must not offer both. A size
 * scale (`defineScale`) offers only the steps of its ramps, so no axis has
 * such a pair. Rides the real browser, because jsdom loads no stylesheet.
 */

const icon = (
	<svg viewBox="0 0 16 16" aria-hidden="true">
		<circle cx="8" cy="8" r="6" />
	</svg>
)

const series = [3, 5, 4, 7, 6, 8]

type Row = { id: number; name: string }

const gridColumns: GridColumn<Row>[] = [{ id: 'name', title: 'Name', cell: (row) => row.name }]

const gridRows: Row[] = [
	{ id: 1, name: 'Alice' },
	{ id: 2, name: 'Bob' },
]

const options = (Option: typeof ListboxOption, Label: typeof ListboxLabel) =>
	['Draft', 'Live'].map((value) => (
		<Option key={value} value={value}>
			<Label>{value}</Label>
		</Option>
	))

/** A render of each component with a `size` axis. */
const FIXTURES: { [N in SizedComponent]: (size: (typeof SIZE_AXES)[N][number]) => ReactNode } = {
	AddressInput: (size) => (
		<AddressInput
			size={size as never}
			aria-label="Address"
			provider={{ search: async () => [], resolve: async () => null } as never}
		/>
	),
	Avatar: (size) => <Avatar size={size as never} initials="CB" />,
	AvatarGroup: (size) => (
		<AvatarGroup size={size as never}>
			<Avatar initials="CB" />
			<Avatar initials="AB" />
		</AvatarGroup>
	),
	AvatarSkeleton: (size) => <AvatarSkeleton size={size as never} />,
	Badge: (size) => (
		<Badge size={size} prefix={icon}>
			Label
		</Badge>
	),
	BadgeSkeleton: (size) => <BadgeSkeleton size={size} />,
	Button: (size) => (
		<Button size={size as never} prefix={icon}>
			Label
		</Button>
	),
	ButtonSkeleton: (size) => <ButtonSkeleton size={size as never} />,
	Calendar: (size) => <Calendar size={size} defaultValue={new Date(2026, 0, 15)} />,
	CalendarRange: (size) => <CalendarRange size={size} />,
	CalendarSkeleton: (size) => <CalendarSkeleton size={size} />,
	Card: (size) => (
		<Card size={size}>
			<CardTitle>Title</CardTitle>
			Body
		</Card>
	),
	CardTitle: (size) => <CardTitle size={size}>Title</CardTitle>,
	ChartSkeleton: (size) => <ChartSkeleton size={size} aspectRatio={false} />,
	Checkbox: (size) => <Checkbox size={size as never} aria-label="Check" defaultChecked />,
	CheckboxSkeleton: (size) => <CheckboxSkeleton size={size as never} />,
	Code: (size) => <Code size={size as never}>code</Code>,
	CodeBlock: (size) => <CodeBlock size={size} code="const step = 1" />,
	ColorPanel: (size) => <ColorPanel size={size as never} defaultValue="#3b82f6" />,
	ColorPanelSkeleton: (size) => <ColorPanelSkeleton size={size as never} />,
	ColorPicker: (size) => (
		<ColorPicker size={size as never} aria-label="Color" defaultValue="#3b82f6" />
	),
	ColorPickerSkeleton: (size) => <ColorPickerSkeleton size={size as never} />,
	Combobox: (size) => (
		<Combobox size={size as never} aria-label="Stage" displayValue={(v: string) => v}>
			{options(ComboboxOption as never, ComboboxLabel as never)}
		</Combobox>
	),
	CommandPaletteClose: (size) => (
		<CommandPalette
			open
			onOpenChange={() => {}}
			triggerShortcut={false}
			footer={<CommandPaletteClose size={size as never} />}
		>
			{null}
		</CommandPalette>
	),
	CommandPaletteShortcut: (size) => (
		<CommandPaletteShortcut size={size as never}>⌘K</CommandPaletteShortcut>
	),
	Control: (size) => (
		<Control size={size as never}>
			<Input aria-label="Value" defaultValue="Value" />
		</Control>
	),
	ControlSkeleton: (size) => <ControlSkeleton size={size as never} />,
	CopyButton: (size) => <CopyButton size={size as never} text="text" />,
	CreditCardInput: (size) => <CreditCardInput size={size as never} aria-label="Card" />,
	CreditCardInputCvv: (size) => <CreditCardInputCvv size={size as never} aria-label="CVV" />,
	CreditCardInputExpiry: (size) => (
		<CreditCardInputExpiry size={size as never} aria-label="Expiry" />
	),
	CurrencyInput: (size) => <CurrencyInput size={size as never} aria-label="Amount" />,
	DateInput: (size) => <DateInput size={size as never} aria-label="Date" />,
	DatePicker: (size) => (
		<DatePicker size={size as never} aria-label="Date" defaultValue={new Date(2026, 0, 1)} />
	),
	DatePickerSkeleton: (size) => <DatePickerSkeleton size={size as never} />,
	DrawerPanel: (size) => (
		<Drawer open onOpenChange={() => {}}>
			<DrawerPanel size={size}>
				<DrawerTitle>Title</DrawerTitle>
				<DrawerBody>Body</DrawerBody>
			</DrawerPanel>
		</Drawer>
	),
	FileUploadButton: (size) => <FileUploadButton size={size as never} />,
	FileUploadInput: (size) => <FileUploadInput size={size as never} aria-label="File" />,
	Grid: (size) => (
		<Grid size={size} columns={gridColumns} rows={gridRows} getKey={(row) => row.id} />
	),
	Group: (size) => (
		<Group size={size as never}>
			<Input aria-label="Value" />
			<Button>Go</Button>
		</Group>
	),
	Heading: (size) => <Heading size={size}>Heading</Heading>,
	HeadingSkeleton: (size) => <HeadingSkeleton size={size} />,
	HoldButton: (size) => <HoldButton size={size as never}>Hold</HoldButton>,
	Icon: (size) => <Icon size={size} icon={icon} />,
	Input: (size) => <Input size={size as never} aria-label="Value" defaultValue="Value" />,
	Kbd: (size) => <Kbd size={size as never}>⌘K</Kbd>,
	Listbox: (size) => (
		<Listbox
			size={size as never}
			aria-label="Stage"
			defaultValue="Draft"
			displayValue={(v: string) => v}
		>
			{options(ListboxOption, ListboxLabel)}
		</Listbox>
	),
	LoadingDots: (size) => <LoadingDots size={size} />,
	LoadingSpinner: (size) => <LoadingSpinner size={size} />,
	MaskInput: (size) => <MaskInput size={size as never} aria-label="Code" mask={phoneMask()} />,
	Menu: (size) => (
		<Menu size={size} open onOpenChange={() => {}}>
			<MenuTrigger>
				<Button>Open</Button>
			</MenuTrigger>
			<MenuContent>
				<MenuItem>Edit</MenuItem>
			</MenuContent>
		</Menu>
	),
	MenuShortcut: (size) => <MenuShortcut size={size as never}>⌘E</MenuShortcut>,
	NumberInput: (size) => <NumberInput size={size as never} aria-label="Count" defaultValue={1} />,
	PaginationNext: (size) => <PaginationNext size={size as never} href="#next" />,
	PaginationPrevious: (size) => <PaginationPrevious size={size as never} href="#previous" />,
	PasswordConfirmNew: (size) => (
		<PasswordConfirm>
			<PasswordConfirmNew size={size as never} aria-label="Password" />
		</PasswordConfirm>
	),
	PasswordConfirmRepeat: (size) => (
		<PasswordConfirm>
			<PasswordConfirmRepeat size={size as never} aria-label="Repeat" />
		</PasswordConfirm>
	),
	PasswordInput: (size) => <PasswordInput size={size as never} aria-label="Password" />,
	PivotTable: (size) => (
		<PivotTable
			size={size}
			rows={[
				{ lane: 'A', period: 'Q1', loads: 3 },
				{ lane: 'B', period: 'Q1', loads: 4 },
			]}
			keys={{ row: 'lane', column: 'period', value: 'loads' }}
			rowHeader="Lane"
		/>
	),
	PopoverContent: (size) => (
		<Popover open onOpenChange={() => {}}>
			<PopoverTrigger>
				<Button>Open</Button>
			</PopoverTrigger>
			<PopoverContent size={size}>Content</PopoverContent>
		</Popover>
	),
	ProgressBar: (size) => <ProgressBar size={size} value={50} aria-label="Progress" />,
	ProgressBarSkeleton: (size) => <ProgressBarSkeleton size={size} />,
	ProgressGauge: (size) => <ProgressGauge size={size} value={50} aria-label="Progress" />,
	ProgressGaugeSkeleton: (size) => <ProgressGaugeSkeleton size={size} />,
	Radio: (size) => (
		<RadioGroup aria-label="Choice" defaultValue="a">
			<Radio size={size as never} value="a" aria-label="A" />
		</RadioGroup>
	),
	RadioSkeleton: (size) => <RadioSkeleton size={size as never} />,
	RangeSlider: (size) => (
		<RangeSlider size={size as never} aria-label="Range" defaultValue={[20, 80]} />
	),
	Rating: (size) => <Rating size={size as never} aria-label="Rating" defaultValue={3} />,
	RatingSkeleton: (size) => <RatingSkeleton size={size as never} />,
	SearchInput: (size) => <SearchInput size={size as never} aria-label="Search" />,
	Segment: (size) => (
		<Segment size={size} defaultValue="List">
			<SegmentControl aria-label="View">
				<SegmentItem value="List">List</SegmentItem>
				<SegmentItem value="Card">Card</SegmentItem>
			</SegmentControl>
		</Segment>
	),
	SegmentSkeleton: (size) => <SegmentSkeleton size={size} />,
	Select: (size) => (
		<Select
			size={size as never}
			aria-label="Stage"
			defaultValue="Draft"
			displayValue={(v: string) => v}
		>
			{options(SelectOption as never, SelectLabel as never)}
		</Select>
	),
	SidebarItem: (size) => (
		<SidebarItem size={size as never} icon={icon}>
			Home
		</SidebarItem>
	),
	SidebarSkeleton: (size) => <SidebarSkeleton size={size as never} />,
	Slider: (size) => <Slider size={size as never} aria-label="Value" defaultValue={50} />,
	SliderSkeleton: (size) => <SliderSkeleton size={size as never} />,
	Sparkline: (size) => <Sparkline size={size} data={series} aria-label="Trend" />,
	SparklineSkeleton: (size) => <SparklineSkeleton size={size} />,
	StatSkeleton: (size) => <StatSkeleton size={size as never} />,
	StatValue: (size) => <StatValue size={size as never}>$1,234</StatValue>,
	StatValueSkeleton: (size) => <StatValueSkeleton size={size as never} />,
	StatusDot: (size) => <StatusDot size={size} />,
	Swatch: (size) => <Swatch size={size} color="#3b82f6" />,
	Switch: (size) => <Switch size={size as never} aria-label="Toggle" defaultChecked />,
	SwitchSkeleton: (size) => <SwitchSkeleton size={size as never} />,
	TabListSkeleton: (size) => <TabListSkeleton size={size} />,
	Table: (size) => (
		<Table size={size}>
			<TableHead>
				<TableRow>
					<TableHeader>Name</TableHeader>
				</TableRow>
			</TableHead>
			<TableBody>
				<TableRow>
					<TableCell>Alice</TableCell>
				</TableRow>
			</TableBody>
		</Table>
	),
	Tabs: (size) => (
		<Tabs size={size} defaultValue="One">
			<TabList aria-label="Tabs">
				<Tab value="One">One</Tab>
				<Tab value="Two">Two</Tab>
			</TabList>
		</Tabs>
	),
	TagInput: (size) => <TagInput size={size as never} aria-label="Tags" defaultValue={['a']} />,
	Text: (size) => <Text size={size as never}>Text</Text>,
	TextSkeleton: (size) => <TextSkeleton size={size as never} />,
	Textarea: (size) => <Textarea size={size as never} aria-label="Notes" defaultValue="Notes" />,
	TextareaSkeleton: (size) => <TextareaSkeleton size={size as never} />,
	ToggleIconButton: (size) => (
		<ToggleIconButton size={size as never} aria-label="Pin" icon={icon} />
	),
	ToggleIconButtonSkeleton: (size) => <ToggleIconButtonSkeleton size={size as never} />,
	TooltipContent: (size) => (
		<Tooltip open onOpenChange={() => {}}>
			<TooltipTrigger>
				<Button>Open</Button>
			</TooltipTrigger>
			<TooltipContent size={size}>Tip</TooltipContent>
		</Tooltip>
	),
	Tree: (size) => (
		<Tree size={size} aria-label="Files">
			<TreeItem label="Documents" icon={icon} defaultOpen>
				<TreeItem label="report.pdf" icon={icon} />
			</TreeItem>
		</Tree>
	),
	TreeSkeleton: (size) => <TreeSkeleton size={size} />,
}

/** The properties of the computed style that the reading takes. */
const PROPERTIES = [
	'font-size',
	'line-height',
	'padding-top',
	'padding-right',
	'padding-bottom',
	'padding-left',
	'column-gap',
	'row-gap',
	'border-top-left-radius',
] as const

/**
 * Reads the look of `root` and of each element in it: its tag, its slot, its
 * layout box, and the properties of `PROPERTIES`. The layout box of an HTML
 * element ignores a transform, so an open animation does not change it.
 */
function reading(root: Element): string {
	return [root, ...root.querySelectorAll('*')]
		.map((element) => {
			const style = getComputedStyle(element)

			const box =
				element instanceof HTMLElement
					? `${element.offsetWidth}x${element.offsetHeight}`
					: `${style.width}x${style.height}`

			return [
				element.tagName,
				element.getAttribute('data-slot') ?? '',
				box,
				...PROPERTIES.map((property) => style.getPropertyValue(property)),
			].join(' ')
		})
		.join('\n')
}

/**
 * Renders each of `steps` side by side, each in a box of its own, and reads each box
 * when the reading of the page stays the same for two frames. A chart measures
 * its box, and an overlay opens, over a few frames. The read throws when the
 * reading does not settle before the deadline.
 *
 * One render for each step paid two frames for each step. One render for each
 * axis pays them one time. A fixture that portals out of its box, such as an
 * overlay, cannot give a reading of its own box. So when an element appears
 * outside the render, the function renders each step alone and reads the page.
 */
async function settledReadings(
	steps: readonly DensityStep[],
	render: (step: DensityStep) => ReactNode,
): Promise<string[]> {
	const before = new Set(document.body.children)

	const { container } = renderUI(
		<div>
			{steps.map((step) => (
				<div key={step} className="w-[40rem]">
					{render(step)}
				</div>
			))}
		</div>,
	)

	try {
		await settledValue(() => reading(document.body))

		const portaled = [...document.body.children].some(
			(child) => child !== container && !before.has(child),
		)

		if (!portaled) return [...(container.firstElementChild?.children ?? [])].map(reading)
	} finally {
		cleanup()
	}

	const readings: string[] = []

	for (const step of steps) {
		renderUI(<div className="w-[40rem]">{render(step)}</div>)

		try {
			readings.push(await settledValue(() => reading(document.body)))
		} finally {
			cleanup()
		}
	}

	return readings
}

describe('distinct size steps (real browser)', () => {
	it.each(Object.keys(SIZE_AXES) as SizedComponent[])(
		'renders each size step of %s with a look of its own',
		{ timeout: budget(30_000) },
		async (name) => {
			const steps: readonly DensityStep[] = SIZE_AXES[name]

			// Each step comes from the axis of `name`, so it fits the fixture of `name`.
			// TypeScript does not relate the two lookups by `name`.
			const render = FIXTURES[name] as (size: DensityStep) => ReactNode

			const readings = await settledReadings(steps, render)

			const same = steps
				.slice(1)
				.filter((_, index) => readings[index + 1] === readings[index])
				.map((step, index) => `${steps[index]}=${step}`)

			expect(same).toEqual([])
		},
	)
})
