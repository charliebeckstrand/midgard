import type { ReactElement } from 'react'
import { describe, expect, it } from 'vitest'
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
import { ColorPanel, ColorPanelSkeleton } from '../../../components/color'
import { ControlSkeleton } from '../../../components/control'
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
import { List, ListDescription, ListItem, ListLabel, ListSkeleton } from '../../../components/list'
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
import { ToggleIconButton, ToggleIconButtonSkeleton } from '../../../components/toggle-icon-button'
import type { InnerStep } from '../../../core/density'
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

	it.each(['sm', 'md', 'lg'] as const)('ColorPanelSkeleton has the box of a %s panel', (size) => {
		const real = box(
			renderUI(<ColorPanel size={size} defaultValue="#3b82f6" />).container.firstElementChild,
			'color panel',
		)

		const skeleton = placeholder(renderUI(<ColorPanelSkeleton size={size} />).container)

		expect(skeleton.width).toBe(real.width)

		// The panel height has a fraction of a pixel from its text lines.
		expect(skeleton.height).toBeNear(real.height, PIXEL)
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

	it.each(['xs', 'sm', 'md', 'lg'] as const)(
		'ControlSkeleton has the height of a %s input',
		(size) => {
			const { container } = renderUI(<Input aria-label="Name" size={size} />)

			expect(placeholder(renderUI(<ControlSkeleton size={size} />).container).height).toBe(
				height(container.querySelector('[data-slot="control-frame"]'), 'control'),
			)
		},
	)

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
})
