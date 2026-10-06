import { File, Inbox, Settings, Star } from 'lucide-react'
import type { ReactElement } from 'react'
import { describe, expect, it } from 'vitest'
import {
	Accordion,
	AccordionItem,
	AccordionSkeleton,
	AccordionTrigger,
} from '../../../components/accordion'
import { Avatar, AvatarSkeleton } from '../../../components/avatar'
import { Badge, BadgeSkeleton } from '../../../components/badge'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbSeparator,
	BreadcrumbSkeleton,
} from '../../../components/breadcrumb'
import { Button, ButtonSkeleton } from '../../../components/button'
import { Calendar, CalendarSkeleton } from '../../../components/calendar'
import { Checkbox, CheckboxSkeleton } from '../../../components/checkbox'
import {
	ColorPanel,
	type ColorPanelProps,
	ColorPanelSkeleton,
	ColorPicker,
	ColorPickerSkeleton,
} from '../../../components/color'
import { DEFAULT_SWATCHES } from '../../../components/color/color-constants'
import { ControlSkeleton } from '../../../components/control'
import { DatePicker, DatePickerSkeleton } from '../../../components/date-picker'
import {
	DescriptionDetails,
	DescriptionList,
	DescriptionListSkeleton,
	DescriptionTerm,
} from '../../../components/description-list'
import {
	Filters,
	FiltersBar,
	FiltersField,
	FiltersRow,
	FiltersSkeleton,
} from '../../../components/filters'
import { Input } from '../../../components/input'
import {
	Kanban,
	KanbanCard,
	KanbanCardSkeleton,
	KanbanColumn,
	KanbanColumnBody,
	KanbanColumnHeader,
	KanbanColumnTitle,
} from '../../../components/kanban'
import { List, ListDescription, ListItem, ListLabel, ListSkeleton } from '../../../components/list'
import { Nav, NavItem, NavList, NavSkeleton } from '../../../components/nav'
import {
	Pagination,
	PaginationList,
	PaginationNext,
	PaginationPage,
	PaginationPrevious,
	PaginationSkeleton,
} from '../../../components/pagination'
import {
	ProgressBar,
	ProgressBarSkeleton,
	ProgressGauge,
	ProgressGaugeSkeleton,
} from '../../../components/progress'
import { Radio, RadioSkeleton } from '../../../components/radio'
import { Rating, RatingSkeleton } from '../../../components/rating'
import { Segment, SegmentControl, SegmentItem, SegmentSkeleton } from '../../../components/segment'
import {
	Sidebar,
	SidebarItem,
	SidebarLabel,
	SidebarList,
	SidebarSkeleton,
} from '../../../components/sidebar'
import { Slider, SliderSkeleton } from '../../../components/slider'
import { Sparkline, SparklineSkeleton } from '../../../components/sparkline'
import {
	Stat,
	StatDelta,
	StatDeltaSkeleton,
	StatDescription,
	StatDescriptionSkeleton,
	StatLabel,
	StatLabelSkeleton,
	StatSkeleton,
	StatValue,
	StatValueSkeleton,
} from '../../../components/stat'
import { Stepper, StepperSkeleton, StepperStep, StepperTitle } from '../../../components/stepper'
import { Switch, SwitchSkeleton } from '../../../components/switch'
import { Tab, TabList, TabListSkeleton, Tabs } from '../../../components/tabs'
import { Text, TextSkeleton } from '../../../components/text'
import { Textarea, TextareaSkeleton } from '../../../components/textarea'
import {
	Timeline,
	TimelineItem,
	TimelineSkeleton,
	TimelineTimestamp,
	TimelineTitle,
} from '../../../components/timeline'
import { ToggleIconButton, ToggleIconButtonSkeleton } from '../../../components/toggle-icon-button'
import { Tree, TreeItem, TreeSkeleton } from '../../../components/tree'
import type { InnerStep } from '../../../core/density'
import { BarChart, ChartSkeleton, PieChart } from '../../../modules/chart'
import { ChatMessage, ChatTranscriptSkeleton } from '../../../modules/chat'
import { MapSkeleton } from '../../../modules/map'
import { ALBERS_USA_ASPECT } from '../../../modules/map/engine/map-constants'
import { Box } from '../../../structure/box'
import { present, renderUI } from '../../helpers'
import { PIXEL } from '../../helpers/geometry/tolerance'

/**
 * A skeleton reserves the box of the component that replaces it, so the swap moves nothing. This
 * measures the real component and its skeleton at each size step.
 *
 * Rides the real browser because the claim is a computed one: jsdom loads no stylesheet.
 */
const box = (el: Element | null | undefined, what: string) => {
	const rect = present(el, what).getBoundingClientRect()

	return { height: rect.height, width: rect.width }
}

const placeholder = (container: HTMLElement) =>
	box(container.querySelector('[data-slot="placeholder"]'), 'skeleton')

describe('skeleton parity (real browser)', () => {
	it.each(['xs', 'sm', 'md', 'lg'] as const)(
		'ButtonSkeleton has the height of a %s button',
		(size) => {
			const real = box(
				renderUI(<Button size={size}>Save</Button>).container.querySelector('button'),
				'button',
			)

			expect(placeholder(renderUI(<ButtonSkeleton size={size} />).container).height).toBe(
				real.height,
			)
		},
	)

	it.each(['xs', 'sm', 'md', 'lg'] as const)(
		'ToggleIconButtonSkeleton has the box of a %s toggle',
		(size) => {
			const real = box(
				renderUI(
					<ToggleIconButton size={size} aria-label="Pin" icon={<svg data-slot="icon" />} />,
				).container.querySelector('button'),
				'toggle',
			)

			expect(
				placeholder(renderUI(<ToggleIconButtonSkeleton size={size} />).container),
			).toStrictEqual(real)
		},
	)

	// Each pair renders the real component and its skeleton at one step. The box of the real
	// component is its `data-slot` element; the skeleton is its placeholder.
	const pairs: [
		string,
		string,
		(size: InnerStep) => ReactElement,
		(size: InnerStep) => ReactElement,
	][] = [
		[
			'Checkbox',
			'control',
			(size) => <Checkbox aria-label="Agree" size={size} />,
			(size) => <CheckboxSkeleton size={size} />,
		],
		[
			'Radio',
			'control',
			(size) => <Radio aria-label="Pick" size={size} />,
			(size) => <RadioSkeleton size={size} />,
		],
		[
			'Switch',
			'control',
			(size) => <Switch aria-label="On" size={size} />,
			(size) => <SwitchSkeleton size={size} />,
		],
		[
			'ProgressGauge',
			'progress-gauge',
			(size) => <ProgressGauge aria-label="Upload" size={size} />,
			(size) => <ProgressGaugeSkeleton size={size} />,
		],
	]

	describe.each(pairs)('%sSkeleton', (_, slot, real, skeleton) => {
		it.each(['sm', 'md', 'lg'] as const)('has the box of a %s component', (size) => {
			const { container } = renderUI(real(size))

			expect(placeholder(renderUI(skeleton(size)).container)).toStrictEqual(
				box(container.querySelector(`[data-slot="${slot}"]`), slot),
			)
		})
	})

	it.each(['sm', 'md', 'lg'] as const)('ProgressBarSkeleton has the height of a %s bar', (size) => {
		const real = box(
			renderUI(<ProgressBar aria-label="Upload" size={size} />).container.firstElementChild,
			'progress bar',
		)

		expect(placeholder(renderUI(<ProgressBarSkeleton size={size} />).container).height).toBe(
			real.height,
		)
	})

	it.each(['sm', 'md', 'lg'] as const)('SliderSkeleton has the height of a %s slider', (size) => {
		const real = box(
			renderUI(<Slider aria-label="Volume" size={size} />).container.firstElementChild,
			'slider',
		)

		const skeleton = present(
			renderUI(<SliderSkeleton size={size} />).container.querySelector('[data-slot="placeholder"]'),
			'skeleton',
		)

		// The skeleton reserves the hit area of the slider with its vertical margins.
		const { marginTop, marginBottom } = getComputedStyle(skeleton)

		expect(
			skeleton.getBoundingClientRect().height +
				Number.parseFloat(marginTop) +
				Number.parseFloat(marginBottom),
		).toBe(real.height)
	})

	it.each(['sm', 'md', 'lg'] as const)('RatingSkeleton has the box of a %s rating', (size) => {
		const real = box(
			renderUI(<Rating aria-label="Score" readOnly value={3} size={size} />).container
				.firstElementChild,
			'rating',
		)

		expect(
			box(renderUI(<RatingSkeleton size={size} />).container.firstElementChild, 'skeleton'),
		).toStrictEqual(real)
	})

	// Each panel sets the axes that move the silhouette: the alpha slider, and the rows of the
	// swatch grid or no grid.
	const panels: [string, Pick<ColorPanelProps, 'alpha' | 'swatches'>][] = [
		['a default panel', {}],
		['an alpha panel', { alpha: true }],
		['a panel with no swatches', { swatches: false }],
		['a panel with one swatch row', { swatches: DEFAULT_SWATCHES.slice(0, 10) }],
	]

	describe.each(panels)('ColorPanelSkeleton of %s', (_, props) => {
		it.each(['sm', 'md', 'lg'] as const)('has the box of the panel at %s', (size) => {
			const real = box(
				renderUI(<ColorPanel {...props} size={size} defaultValue="#3b82f6" />).container
					.firstElementChild,
				'color panel',
			)

			expect(
				placeholder(renderUI(<ColorPanelSkeleton {...props} size={size} />).container),
			).toStrictEqual(real)
		})
	})

	it.each([
		['sm', false],
		['md', false],
		['lg', false],
		['sm', true],
		['md', true],
		['lg', true],
	] as const)('ColorPickerSkeleton has the box of a %s picker, alpha %s', (size, alpha) => {
		const real = box(
			renderUI(
				<ColorPicker
					aria-label="Color"
					size={size}
					alpha={alpha}
					defaultValue={alpha ? '#3b82f680' : '#3b82f6'}
				/>,
			).container.querySelector('[data-slot="control-frame"]'),
			'color picker',
		)

		const skeleton = placeholder(
			renderUI(<ColorPickerSkeleton size={size} alpha={alpha} />).container,
		)

		expect(skeleton.width).toBeNear(real.width, PIXEL)

		expect(skeleton.height).toBeNear(real.height, PIXEL)
	})

	it.each([
		['sm', false],
		['md', false],
		['lg', false],
		['sm', true],
		['md', true],
		['lg', true],
	] as const)('DatePickerSkeleton has the box of a %s picker, range %s', (size, range) => {
		const trigger = (start: Date, end: Date) =>
			box(
				renderUI(
					range ? (
						<DatePicker aria-label="Dates" size={size} range defaultValue={[start, end]} />
					) : (
						<DatePicker aria-label="Date" size={size} defaultValue={end} />
					),
				).container.querySelector('[data-slot="control-frame"]'),
				'date picker',
			)

		// The digits of a date do not have the same width, so the trigger width
		// changes with the value. The skeleton is between the trigger with short
		// dates and the trigger with long dates. A single picker shows the second
		// date.
		const short = trigger(new Date(2026, 0, 1), new Date(2026, 0, 8))

		const long = trigger(new Date(2026, 11, 1), new Date(2026, 11, 28))

		const skeleton = placeholder(
			renderUI(<DatePickerSkeleton size={size} range={range} />).container,
		)

		expect(skeleton.width).toBeGreaterThan(short.width)

		expect(skeleton.width).toBeLessThan(long.width)

		expect(skeleton.height).toBeNear(short.height, PIXEL)
	})

	it.each(['sm', 'md', 'lg'] as const)('TextareaSkeleton has the box of a %s textarea', (size) => {
		const real = box(
			renderUI(
				<Box density={size}>
					<Textarea aria-label="Notes" rows={3} />
				</Box>,
			).container.querySelector('textarea'),
			'textarea',
		)

		const skeleton = renderUI(
			<Box density={size}>
				<TextareaSkeleton rows={3} />
			</Box>,
		).container.querySelector('[data-slot="placeholder"]')

		expect(box(skeleton, 'skeleton')).toStrictEqual(real)

		expect(getComputedStyle(present(skeleton, 'skeleton')).borderRadius).toBe(
			getComputedStyle(present(document.querySelector('textarea'), 'textarea')).borderRadius,
		)
	})

	it.each([
		['horizontal', 'sm'],
		['horizontal', 'md'],
		['horizontal', 'lg'],
		['vertical', 'sm'],
		['vertical', 'md'],
		['vertical', 'lg'],
	] as const)(
		'DescriptionListSkeleton has the box of a %s description list at %s',
		(orientation, size) => {
			const real = box(
				renderUI(
					<Box density={size}>
						<DescriptionList orientation={orientation}>
							<DescriptionTerm>Name</DescriptionTerm>
							<DescriptionDetails>Wade Cooper</DescriptionDetails>
							<DescriptionTerm>Email</DescriptionTerm>
							<DescriptionDetails>wade@example.com</DescriptionDetails>
							<DescriptionTerm>Role</DescriptionTerm>
							<DescriptionDetails>Admin</DescriptionDetails>
						</DescriptionList>
					</Box>,
				).container.firstElementChild,
				'description list',
			)

			expect(
				box(
					renderUI(
						<Box density={size}>
							<DescriptionListSkeleton rows={3} orientation={orientation} />
						</Box>,
					).container.firstElementChild,
					'skeleton',
				),
			).toStrictEqual(real)
		},
	)

	const listRows = [
		{ id: 'a', label: 'Invoices' },
		{ id: 'b', label: 'Receipts' },
		{ id: 'c', label: 'Statements' },
	]

	it.each([
		['separated', false],
		['outline', false],
		['plain', false],
		['solid', false],
		['separated', true],
		['outline', true],
	] as const)('ListSkeleton has the box of a %s list (description: %s)', (variant, described) => {
		const real = box(
			renderUI(
				<List items={listRows} variant={variant} sortable={false} aria-label="Files">
					{(row) => (
						<ListItem>
							<ListLabel>{row.label}</ListLabel>
							{described ? <ListDescription>Updated today</ListDescription> : null}
						</ListItem>
					)}
				</List>,
			).container.querySelector('[data-slot="list"]'),
			'list',
		)

		expect(
			box(
				renderUI(<ListSkeleton items={3} variant={variant} description={described} />).container
					.firstElementChild,
				'skeleton',
			),
		).toStrictEqual(real)
	})

	const navRows = [
		{ id: 'inbox', label: 'Inbox', icon: <Inbox /> },
		{ id: 'starred', label: 'Starred', icon: <Star /> },
		{ id: 'settings', label: 'Settings', icon: <Settings /> },
	]

	it.each(['sm', 'md', 'lg'] as const)(
		'SidebarSkeleton has the box of a %s sidebar list',
		(size) => {
			const real = box(
				renderUI(
					<Box density={size}>
						<Sidebar>
							<SidebarList aria-label="Primary">
								{navRows.map((row) => (
									<SidebarItem key={row.id} href={`#${row.id}`} icon={row.icon}>
										<SidebarLabel>{row.label}</SidebarLabel>
									</SidebarItem>
								))}
							</SidebarList>
						</Sidebar>
					</Box>,
				).container.querySelector('[data-slot="sidebar-list"]'),
				'sidebar list',
			)

			expect(
				box(
					renderUI(
						<Box density={size}>
							<Sidebar>
								<SidebarSkeleton items={3} />
							</Sidebar>
						</Box>,
					).container.querySelector('[data-slot="sidebar"]')?.firstElementChild,
					'skeleton',
				),
			).toStrictEqual(real)
		},
	)

	it('SidebarSkeleton takes the step of its size, as the items do', () => {
		const real = box(
			renderUI(
				<Sidebar>
					<SidebarList aria-label="Primary">
						{navRows.map((row) => (
							<SidebarItem key={row.id} href={`#${row.id}`} icon={row.icon} size="lg">
								<SidebarLabel>{row.label}</SidebarLabel>
							</SidebarItem>
						))}
					</SidebarList>
				</Sidebar>,
			).container.querySelector('[data-slot="sidebar-list"]'),
			'sidebar list',
		)

		expect(
			box(
				renderUI(
					<Sidebar>
						<SidebarSkeleton items={3} size="lg" />
					</Sidebar>,
				).container.querySelector('[data-slot="sidebar"]')?.firstElementChild,
				'skeleton',
			),
		).toStrictEqual(real)
	})

	it.each([
		['vertical', 'sm'],
		['vertical', 'md'],
		['vertical', 'lg'],
		['horizontal', 'sm'],
		['horizontal', 'md'],
		['horizontal', 'lg'],
	] as const)('NavSkeleton has the box of a %s nav list at %s', (orientation, size) => {
		const real = box(
			renderUI(
				<Box density={size}>
					<Nav>
						<NavList orientation={orientation}>
							{navRows.map((row) => (
								<NavItem key={row.id} href={`#${row.id}`} icon={row.icon}>
									{row.label}
								</NavItem>
							))}
						</NavList>
					</Nav>
				</Box>,
			).container.querySelector('[data-slot="nav-list"]'),
			'nav list',
		)

		expect(
			box(
				renderUI(
					<Box density={size}>
						<Nav>
							<NavSkeleton items={3} orientation={orientation} />
						</Nav>
					</Box>,
				).container.querySelector('[data-slot="nav"]')?.firstElementChild,
				'skeleton',
			),
		).toStrictEqual(real)
	})

	it.each([
		['separated', 'sm'],
		['separated', 'md'],
		['separated', 'lg'],
		['outline', 'sm'],
		['outline', 'md'],
		['outline', 'lg'],
		['plain', 'sm'],
		['plain', 'md'],
		['plain', 'lg'],
	] as const)(
		'AccordionSkeleton has the box of a collapsed %s accordion at %s',
		(variant, size) => {
			const real = box(
				renderUI(
					<Box density={size}>
						<Accordion type="single" variant={variant}>
							<AccordionItem value="shipping">
								<AccordionTrigger>Shipping</AccordionTrigger>
							</AccordionItem>
							<AccordionItem value="returns">
								<AccordionTrigger>Returns</AccordionTrigger>
							</AccordionItem>
							<AccordionItem value="warranty">
								<AccordionTrigger>Warranty</AccordionTrigger>
							</AccordionItem>
						</Accordion>
					</Box>,
				).container.querySelector('[data-slot="accordion"]'),
				'accordion',
			)

			expect(
				box(
					renderUI(
						<Box density={size}>
							<AccordionSkeleton items={3} variant={variant} />
						</Box>,
					).container.firstElementChild?.firstElementChild,
					'skeleton',
				),
			).toStrictEqual(real)
		},
	)

	it.each(['xs', 'sm', 'md', 'lg'] as const)(
		'TextSkeleton has the line height of %s text',
		(size) => {
			const real = box(renderUI(<Text size={size}>Total</Text>).container.firstElementChild, 'text')

			expect(placeholder(renderUI(<TextSkeleton size={size} />).container).height).toBe(real.height)
		},
	)

	// The browser viewport is 414 wide, below `sm`, so the responsive layout is vertical.
	it.each(['horizontal', 'vertical', undefined] as const)(
		'StepperSkeleton has the box of a stepper (orientation: %s)',
		(orientation) => {
			const real = box(
				renderUI(
					<Stepper orientation={orientation} value={0}>
						<StepperStep value={0}>
							<StepperTitle>Account</StepperTitle>
						</StepperStep>
						<StepperStep value={1}>
							<StepperTitle>Profile</StepperTitle>
						</StepperStep>
						<StepperStep value={2}>
							<StepperTitle>Review</StepperTitle>
						</StepperStep>
					</Stepper>,
				).container.querySelector('[data-slot="stepper"]'),
				'stepper',
			)

			const skeleton = box(
				renderUI(<StepperSkeleton steps={3} orientation={orientation} />).container
					.firstElementChild,
				'skeleton',
			)

			expect(skeleton).toStrictEqual(real)
		},
	)

	// A horizontal item is a narrow column, so each title is one word. A longer title wraps to
	// two lines, and the skeleton draws one.
	it.each([
		['vertical', 'sm'],
		['vertical', 'md'],
		['vertical', 'lg'],
		['horizontal', 'sm'],
		['horizontal', 'md'],
		['horizontal', 'lg'],
	] as const)('TimelineSkeleton has the box of a %s timeline at %s', (orientation, size) => {
		const real = box(
			renderUI(
				<Box density={size}>
					<Timeline orientation={orientation}>
						<TimelineItem>
							<TimelineTitle>Kickoff</TimelineTitle>
							<TimelineTimestamp>Jan 2026</TimelineTimestamp>
						</TimelineItem>
						<TimelineItem status="info">
							<TimelineTitle>Design</TimelineTitle>
							<TimelineTimestamp>Feb 2026</TimelineTimestamp>
						</TimelineItem>
						<TimelineItem>
							<TimelineTitle>Launch</TimelineTitle>
							<TimelineTimestamp>Mar 2026</TimelineTimestamp>
						</TimelineItem>
					</Timeline>
				</Box>,
			).container.querySelector('[data-slot="timeline"]'),
			'timeline',
		)

		const skeleton = box(
			renderUI(
				<Box density={size}>
					<TimelineSkeleton items={3} orientation={orientation} />
				</Box>,
			).container.querySelector('ol'),
			'skeleton',
		)

		expect(skeleton).toStrictEqual(real)
	})

	it.each(['horizontal', 'vertical'] as const)(
		'TabListSkeleton has the height of a %s tab list',
		(orientation) => {
			const real = box(
				renderUI(
					<Tabs defaultValue="a" orientation={orientation}>
						<TabList aria-label="Sections">
							<Tab value="a">Overview</Tab>
							<Tab value="b">Activity</Tab>
							<Tab value="c">Settings</Tab>
						</TabList>
					</Tabs>,
				).container.querySelector('[data-slot="tab-list"]'),
				'tab list',
			)

			const skeleton = box(
				renderUI(<TabListSkeleton tabs={3} orientation={orientation} />).container
					.firstElementChild,
				'skeleton',
			)

			expect(skeleton.height).toBe(real.height)
		},
	)

	const height = (el: Element | null | undefined, what: string) => box(el, what).height

	it.each(['sm', 'md', 'lg'] as const)('AvatarSkeleton has the box of a %s avatar', (size) => {
		const { container } = renderUI(<Avatar size={size} initials="WC" alt="Wade Cooper" />)

		expect(placeholder(renderUI(<AvatarSkeleton size={size} />).container)).toStrictEqual(
			box(container.querySelector('[data-slot="avatar"]'), 'avatar'),
		)
	})

	it.each(['xs', 'sm', 'md', 'lg'] as const)(
		'BadgeSkeleton has the height of a %s badge',
		(size) => {
			const { container } = renderUI(<Badge size={size}>New</Badge>)

			expect(placeholder(renderUI(<BadgeSkeleton size={size} />).container).height).toBe(
				height(container.querySelector('[data-slot="badge"]'), 'badge'),
			)
		},
	)

	it.each(['sm', 'md', 'lg'] as const)('ControlSkeleton has the height of a %s input', (size) => {
		const { container } = renderUI(<Input aria-label="Name" size={size} />)

		expect(placeholder(renderUI(<ControlSkeleton size={size} />).container).height).toBe(
			height(container.querySelector('[data-slot="control-frame"]'), 'control'),
		)
	})

	it.each(['sm', 'md', 'lg'] as const)(
		'SparklineSkeleton has the box of a %s sparkline',
		(size) => {
			const { container } = renderUI(
				<Sparkline data={[3, 5, 4, 8]} size={size} aria-label="Trend" />,
			)

			expect(placeholder(renderUI(<SparklineSkeleton size={size} />).container)).toStrictEqual(
				box(container.querySelector('[data-slot="sparkline"]'), 'sparkline'),
			)
		},
	)

	it('SegmentSkeleton has the height of a segment control', () => {
		const { container } = renderUI(
			<Segment defaultValue="list" aria-label="View">
				<SegmentControl aria-label="View">
					<SegmentItem value="list">List</SegmentItem>
					<SegmentItem value="grid">Grid</SegmentItem>
				</SegmentControl>
			</Segment>,
		)

		expect(placeholder(renderUI(<SegmentSkeleton />).container).height).toBe(
			height(container.querySelector('[role="tablist"]'), 'segment control'),
		)
	})

	it('PaginationSkeleton has the height of a pagination', () => {
		const { container } = renderUI(
			<Pagination>
				<PaginationPrevious />
				<PaginationList>
					<PaginationPage current>1</PaginationPage>
					<PaginationPage>2</PaginationPage>
				</PaginationList>
				<PaginationNext />
			</Pagination>,
		)

		expect(
			height(renderUI(<PaginationSkeleton pages={4} />).container.firstElementChild, 'skeleton'),
		).toBe(height(container.querySelector('[data-slot="pagination"]'), 'pagination'))
	})

	it('BreadcrumbSkeleton has the height of a breadcrumb', () => {
		const { container } = renderUI(
			<Breadcrumb>
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
		)

		expect(
			height(renderUI(<BreadcrumbSkeleton crumbs={2} />).container.firstElementChild, 'skeleton'),
		).toBe(height(container.querySelector('ol'), 'breadcrumb list'))
	})

	it.each(['sm', 'md', 'lg'] as const)('StatValueSkeleton has the height of a %s value', (size) => {
		const { container } = renderUI(
			<Stat>
				<StatValue size={size}>$12,345</StatValue>
			</Stat>,
		)

		expect(placeholder(renderUI(<StatValueSkeleton size={size} />).container).height).toBe(
			height(container.querySelector('[data-slot="stat-value"]'), 'stat value'),
		)
	})

	it.each([
		[
			'StatLabel',
			'stat-label',
			<StatLabel key="l">Revenue</StatLabel>,
			<StatLabelSkeleton key="s" />,
		],
		[
			'StatDescription',
			'stat-description',
			<StatDescription key="d">Since last month</StatDescription>,
			<StatDescriptionSkeleton key="s" />,
		],
		['StatDelta', 'stat-delta', <StatDelta key="t">+4%</StatDelta>, <StatDeltaSkeleton key="s" />],
	] as const)('%sSkeleton has the height of its slot', (_, slot, real, skeleton) => {
		const { container } = renderUI(<Stat>{real}</Stat>)

		expect(placeholder(renderUI(skeleton).container).height).toBe(
			height(container.querySelector(`[data-slot="${slot}"]`), slot),
		)
	})

	it.each(['sm', 'md', 'lg'] as const)('StatSkeleton has the height of a %s stat', (size) => {
		const { container } = renderUI(
			<Stat>
				<StatLabel>Revenue</StatLabel>
				<StatValue size={size}>$12,345</StatValue>
				<StatDelta>+4%</StatDelta>
				<StatDescription>Since last month</StatDescription>
			</Stat>,
		)

		expect(
			height(
				renderUI(<StatSkeleton size={size} delta description />).container.firstElementChild,
				'skeleton',
			),
		).toBe(height(container.querySelector('[data-slot="stat"]'), 'stat'))
	})

	it.each(['stack', 'rail'] as const)(
		'FiltersSkeleton has the box of a %s filter row',
		(layout) => {
			const real = box(
				renderUI(
					<Filters aria-label="Filters" layout={layout} defaultValue={{}}>
						<FiltersBar>
							<FiltersRow>
								{['a', 'b', 'c'].map((name) => (
									<FiltersField key={name} name={name} className="w-52">
										<Input aria-label={name} />
									</FiltersField>
								))}
							</FiltersRow>
						</FiltersBar>
					</Filters>,
				).container.querySelector('[data-slot="filters-row"]'),
				'filter row',
			)

			expect(
				box(
					renderUI(<FiltersSkeleton fields={3} layout={layout} fieldClassName="w-52" />).container
						.firstElementChild,
					'skeleton',
				),
			).toStrictEqual(real)
		},
	)

	it.each(['sm', 'md', 'lg'] as const)('CalendarSkeleton has the box of a %s calendar', (size) => {
		// A month that spans six weeks, the tallest month a calendar draws.
		const { container } = renderUI(<Calendar size={size} defaultValue={new Date(2026, 4, 15)} />)

		expect(placeholder(renderUI(<CalendarSkeleton size={size} />).container)).toStrictEqual(
			box(container.querySelector('[data-slot="calendar"]'), 'calendar'),
		)
	})

	// The calendar has no xs step, so in an xs scope it opens an sm scope. The skeleton with no
	// size takes the xs scope, so each of its rows must give the sm height at xs.
	it('CalendarSkeleton with no size has the box of a calendar in an xs scope', () => {
		const { container } = renderUI(
			<Box density="xs">
				<Calendar defaultValue={new Date(2026, 4, 15)} />
			</Box>,
		)

		expect(
			placeholder(
				renderUI(
					<Box density="xs">
						<CalendarSkeleton />
					</Box>,
				).container,
			),
		).toStrictEqual(box(container.querySelector('[data-slot="calendar"]'), 'calendar'))
	})

	// A transcript has no fixed height, so this compares one bubble of each side. The real
	// bubble holds as many lines as the skeleton bubble of its side: one for the user, and two for
	// the assistant. The column is fixed, so the bubbles of both sides align to the same edges.
	it.each([
		['user', 0, 'right', 'Where are the stops?'],
		['assistant', 1, 'left', 'Here are the stops.\nTwo of them run late.'],
	] as const)(
		'ChatTranscriptSkeleton has the %s bubble of a transcript',
		(sender, index, edge, text) => {
			const real = present(
				renderUI(
					<div className="w-120">
						<ChatMessage sender={sender}>{text}</ChatMessage>
					</div>,
				).container.querySelector('[data-slot="chat-message-bubble"]'),
				'bubble',
			).getBoundingClientRect()

			const skeleton = present(
				renderUI(
					<div className="w-120">
						<ChatTranscriptSkeleton messages={2} />
					</div>,
				).container.querySelectorAll('[data-slot="placeholder"]')[index]?.parentElement,
				'skeleton bubble',
			).getBoundingClientRect()

			expect(skeleton.height).toBeNear(real.height, PIXEL)

			expect(skeleton[edge]).toBeNear(real[edge], PIXEL)
		},
	)

	// A chart sizes its box from its width after it measures, so the test waits until the chart
	// settles at the box of its skeleton. Density does not change the height of a chart, so each
	// case runs in a density scope too.
	const settlesAt = async (chart: ReactElement, skeleton: ReactElement, width: number) => {
		const frame = (child: ReactElement) =>
			renderUI(<div style={{ width }}>{child}</div>).container.firstElementChild?.firstElementChild

		const reserved = box(frame(skeleton), 'skeleton')

		const real = frame(chart)

		expect(reserved.width).toBe(width)

		await expect.poll(() => box(real, 'chart').height).toBeNear(reserved.height, PIXEL)
	}

	const sales = [
		{ quarter: 'Q1', revenue: 40, costs: 24 },
		{ quarter: 'Q2', revenue: 80, costs: 31 },
		{ quarter: 'Q3', revenue: 65, costs: 28 },
	]

	it.each([
		[400, 'sm'],
		[800, 'lg'],
	] as const)('ChartSkeleton has the box of a cartesian chart %ipx wide in %s', (width, step) =>
		settlesAt(
			<Box density={step}>
				<BarChart
					aria-label="Revenue"
					data={sales}
					series={[
						{ xKey: 'quarter', yKey: 'revenue', yName: 'Revenue' },
						{ xKey: 'quarter', yKey: 'costs', yName: 'Costs' },
					]}
				/>
			</Box>,
			<Box density={step}>
				<ChartSkeleton />
			</Box>,
			width,
		),
	)

	it.each([
		[300, 'sm'],
		[800, 'lg'],
	] as const)('the sector ChartSkeleton has the box of a pie %ipx wide in %s', (width, step) =>
		settlesAt(
			<Box density={step}>
				<PieChart
					aria-label="Traffic"
					data={[
						{ source: 'Search', visits: 60 },
						{ source: 'Direct', visits: 25 },
						{ source: 'Referral', visits: 15 },
					]}
					series={[{ xKey: 'source', yKey: 'visits' }]}
				/>
			</Box>,
			<Box density={step}>
				<ChartSkeleton sector />
			</Box>,
			width,
		),
	)

	it.each([
		['the rectangle', undefined, 16 / 9],
		['the outline', 'albers-usa', ALBERS_USA_ASPECT],
	] as const)('MapSkeleton reserves its ratio with %s alone', (_, projection, ratio) => {
		const { container } = renderUI(
			<div style={{ width: 800 }}>
				<MapSkeleton projection={projection} />
			</div>,
		)

		const reserved = placeholder(container)

		expect(reserved.width).toBe(800)

		expect(reserved.height).toBeNear(800 / ratio, PIXEL)
	})

	// The rows go to the depths 0, 1, 2, 1, 0: the pattern of the skeleton.
	const fileTree = (size: InnerStep) => (
		<Tree size={size} aria-label="Files">
			<TreeItem label="src" icon={<File />} defaultOpen>
				<TreeItem label="components" icon={<File />} defaultOpen>
					<TreeItem label="Button.tsx" icon={<File />} />
				</TreeItem>
				<TreeItem label="hooks" icon={<File />} />
			</TreeItem>
			<TreeItem label="README.md" icon={<File />} />
		</Tree>
	)

	it.each(['sm', 'md', 'lg'] as const)('TreeSkeleton has the box of a %s tree', (size) => {
		const { container } = renderUI(fileTree(size))

		const real = box(container.querySelector('[data-slot="tree"]'), 'tree')

		const skeleton = renderUI(<TreeSkeleton rows={5} size={size} />).container.firstElementChild

		expect(box(skeleton, 'skeleton')).toStrictEqual(real)

		// The deepest icon starts where the icon of the real row starts, so the indent matches.
		const realIcon = present(
			container.querySelector('[aria-level="3"] [data-slot="icon"]'),
			'real icon',
		).getBoundingClientRect().left

		const skeletonIcon = present(
			skeleton?.children[2]?.querySelector('[data-slot="placeholder"]'),
			'skeleton icon',
		).getBoundingClientRect().left

		expect(skeletonIcon).toBe(realIcon)
	})

	// A lane that loads keeps its real column, header, and body. The title text and the cards are
	// the leaves that load, so the skeleton lane holds a TextSkeleton title and skeleton cards.
	it('KanbanCardSkeleton and a TextSkeleton title keep the box of a lane', () => {
		const lane = (title: ReactElement | string, cards: ReactElement[]) => (
			<Kanban
				columns={[{ id: 'todo', items: ['a', 'b', 'c'] }]}
				getKey={(item: string) => item}
				aria-label="Loads"
			>
				<KanbanColumn value="todo">
					<KanbanColumnHeader>
						<KanbanColumnTitle>{title}</KanbanColumnTitle>
					</KanbanColumnHeader>
					<KanbanColumnBody>{cards}</KanbanColumnBody>
				</KanbanColumn>
			</Kanban>
		)

		const real = renderUI(
			lane(
				'To do',
				['a', 'b', 'c'].map((item) => (
					<KanbanCard key={item} value={item}>
						<span>Load {item}</span>
						<span>Acme Freight</span>
					</KanbanCard>
				)),
			),
		).container

		const skeleton = renderUI(
			lane(
				<TextSkeleton />,
				['a', 'b', 'c'].map((item) => <KanbanCardSkeleton key={item} />),
			),
		).container

		for (const slot of ['kanban-column', 'kanban-column-header', 'kanban-column-body']) {
			expect(
				box(skeleton.querySelector(`[data-slot="${slot}"]`), `skeleton ${slot}`),
			).toStrictEqual(box(real.querySelector(`[data-slot="${slot}"]`), slot))
		}

		expect(
			box(
				skeleton.querySelector('[data-slot="kanban-column-body"]')?.firstElementChild,
				'skeleton card',
			),
		).toStrictEqual(box(real.querySelector('[data-slot="kanban-card"]'), 'card'))
	})
})
