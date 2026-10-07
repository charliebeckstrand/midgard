import { X } from 'lucide-react'
import type { ReactElement } from 'react'
import { describe, expect, it, onTestFinished } from 'vitest'
import { Button } from '../../../components/button'
import { ColorPanel } from '../../../components/color'
import { DatePicker } from '../../../components/date-picker'
import { Group } from '../../../components/group'
import { Icon } from '../../../components/icon'
import { Nav, NavItem, NavList } from '../../../components/nav'
import { NumberInput } from '../../../components/number-input'
import { Sidebar, SidebarItem, SidebarLabel } from '../../../components/sidebar'
import { TagInput } from '../../../components/tag-input'
import { Toolbar, ToolbarGroup } from '../../../components/toolbar'
import { ChatPrompt } from '../../../modules/chat'
import { Dashboard, DashboardTile } from '../../../modules/dashboard'
import { Grid, type GridColumn } from '../../../modules/grid'
import { Box } from '../../../structure/box'
import { baseline, rows } from '../../a11y/cases'
import { present, renderUI } from '../../helpers'
import { overlappingHitAreas } from './helpers/geometry-invariants'

/**
 * The hit areas of `TouchTarget` at the 44px floor of a coarse pointer. Two
 * hit areas that overlap give the later host all of the overlap, so a
 * container of small hosts caps them at its gap (`primitives/touch-target`).
 *
 * This suite cannot match `pointer: coarse` (see
 * `touch-target-geometry.test.tsx`). Each case therefore sets the 44px floor
 * on each span with a stylesheet, and the real CSS then lays out the coarse
 * hit areas under a fine pointer. `geometry-invariants.test.tsx` checks the
 * 24px floor over the corpus.
 */

/** Sets the 44px floor on each hit area until the case ends. */
function coarseFloor() {
	const sheet = document.createElement('style')

	sheet.textContent = '[data-slot="touch-target"] { --touch-target-floor: 2.75rem !important; }'

	document.head.append(sheet)

	onTestFinished(() => sheet.remove())
}

/** The number of hit areas whose host shows. */
function visibleHitAreas(root: HTMLElement): number {
	return [...root.querySelectorAll<HTMLElement>('[data-slot="touch-target"]')].filter((span) =>
		span.parentElement?.checkVisibility({ visibilityProperty: true }),
	).length
}

type Person = { id: number; name: string; role: string }

const people: Person[] = Array.from({ length: 12 }, (_, index) => ({
	id: index + 1,
	name: `Person ${index + 1}`,
	role: index % 2 ? 'Admin' : 'User',
}))

const columns: GridColumn<Person>[] = [
	{ id: 'name', title: 'Name', field: 'name', cell: (row) => row.name },
	{
		id: 'role',
		title: 'Role',
		field: 'role',
		cell: (row) => row.role,
		value: (row) => row.role,
		groupable: true,
		filterable: true,
	},
]

const noop = () => {}

/** Short tags, so the chips wrap and two remove buttons sit close in a row. */
const letters = [...'abcdefghijklmnop']

const tile = [{ id: 'a', x: 0, y: 0, w: 24, h: 40 }]

/** An icon-only bare button, the smallest host. */
const iconButton = (name: string) => (
	<Button key={name} variant="bare" aria-label={name}>
		<Icon icon={<X />} />
	</Button>
)

/** An icon-only plain button, the host of a toolbar. */
const plainIconButton = (name: string) => (
	<Button key={name} variant="plain" aria-label={name}>
		<Icon icon={<X />} />
	</Button>
)

/**
 * Configurations that pack small controls, beyond the canonical render of the
 * corpus: the small steps, and rows that wrap.
 */
const packed: readonly { name: string; element: ReactElement }[] = [
	// A control has no `xs` step, so each case puts the control in a scope of the
	// step. In an `xs` scope, the control takes `sm`.
	...(['xs', 'sm', 'md'] as const).map((step) => ({
		name: `number input, ${step}`,
		element: (
			<Box density={step}>
				<NumberInput aria-label="Quantity" defaultValue={1} min={0} max={10} />
			</Box>
		),
	})),
	...(['xs', 'sm', 'md'] as const).map((step) => ({
		name: `clearable date picker input, ${step}`,
		element: (
			<Box density={step}>
				<DatePicker aria-label="Date" input clearable defaultValue={new Date(2026, 0, 5)} />
			</Box>
		),
	})),
	// The grid has no `xs` step, so the `xs` case puts the grid in an `xs` scope.
	...(['xs', 'sm', 'md'] as const).map((step) => ({
		name: `grid cell editor, ${step}`,
		element: (
			<Box density={step}>
				<Grid
					aria-label="People"
					columns={columns}
					rows={people.slice(0, 2)}
					getKey={(row) => row.id}
					editable={{
						session: 'managed',
						scope: 'cell',
						defaultCell: { rowKey: 1, columnId: 'name' },
						onCommit: noop,
					}}
				/>
			</Box>
		),
	})),
	{
		name: 'grid header with group-by and filter, narrow',
		element: (
			<div style={{ width: 240 }}>
				<Grid
					aria-label="People"
					columns={columns}
					rows={people}
					getKey={(row) => row.id}
					groupBy={{ groupButton: true }}
					columnFilters={{}}
				/>
			</div>
		),
	},
	{
		name: 'grid pagination, narrow',
		element: (
			<div style={{ width: 360 }}>
				<Grid
					aria-label="People"
					columns={columns}
					rows={people}
					getKey={(row) => row.id}
					pagination={{ defaultValue: { pageIndex: 1, pageSize: 5 } }}
				/>
			</div>
		),
	},
	{
		name: 'dashboard tile in edit mode',
		element: (
			<div style={{ width: 360 }}>
				<Dashboard aria-label="Sales" layout={{ defaultValue: tile }} editing>
					<DashboardTile id="a" title="Revenue" onRemove={noop} onDuplicate={noop}>
						<div />
					</DashboardTile>
				</Dashboard>
			</div>
		),
	},
	{
		// The menu button of a chart shows only on a coarse pointer, which the floor
		// sheet does not match. An app action and the expand control fill the row.
		name: 'dashboard tile with an action and the expand control',
		element: (
			<div style={{ width: 360 }}>
				<Dashboard aria-label="Sales" layout={{ defaultValue: tile }}>
					<DashboardTile id="a" title="Revenue" actions={iconButton('Share')} expandable>
						<div />
					</DashboardTile>
				</Dashboard>
			</div>
		),
	},
	...(['sm', 'md'] as const).map((size) => ({
		name: `color panel, ${size}`,
		element: <ColorPanel size={size} defaultValue="#3b82f6" />,
	})),
	...(['sm', 'md', 'lg'] as const).map((size) => ({
		name: `tag input that wraps, ${size}`,
		element: (
			<div style={{ width: 300 }}>
				<TagInput aria-label="Tags" size={size} defaultValue={letters} />
			</div>
		),
	})),
	{
		name: 'chat prompt with an attach action and wrapped attachments',
		element: (
			<div style={{ width: 300 }}>
				<ChatPrompt
					value=""
					onValueChange={noop}
					onSubmit={noop}
					onAttach={noop}
					placeholder="Message"
					attachments={letters.slice(0, 8).map((name) => new File(['x'], `${name}.pdf`))}
					onRemoveAttachment={noop}
				/>
			</div>
		),
	},
	...(['horizontal', 'vertical'] as const).map((orientation) => ({
		name: `toolbar of icon buttons, ${orientation}`,
		element: (
			<Toolbar aria-label="Tools" orientation={orientation}>
				{plainIconButton('One')}
				<ToolbarGroup aria-label="Zoom">
					{plainIconButton('Two')}
					{plainIconButton('Three')}
				</ToolbarGroup>
				{plainIconButton('Four')}
			</Toolbar>
		),
	})),
	...(['horizontal', 'vertical'] as const).map((orientation) => ({
		name: `group of icon buttons, ${orientation}`,
		element: (
			// At `sm` the members are under the floor on both axes.
			<Group orientation={orientation} size="sm">
				{['One', 'Two', 'Three'].map((name) => (
					<Button key={name} variant="outline" aria-label={name}>
						<Icon icon={<X />} />
					</Button>
				))}
			</Group>
		),
	})),
	...(['horizontal', 'vertical'] as const).map((orientation) => ({
		name: `nav list, ${orientation}`,
		element: (
			<Nav aria-label="Primary">
				<NavList orientation={orientation}>
					<NavItem href="#a" icon={<X />} aria-label="A" />
					<NavItem href="#b" icon={<X />} aria-label="B" />
					<NavItem href="#c" icon={<X />} aria-label="C" />
				</NavList>
			</Nav>
		),
	})),
	{
		name: 'sidebar item with actions',
		element: (
			<Sidebar>
				<SidebarItem
					href="#inbox"
					suffix={
						<>
							{iconButton('Archive')}
							{iconButton('Delete')}
						</>
					}
				>
					<SidebarLabel>Inbox</SidebarLabel>
				</SidebarItem>
				<SidebarItem href="#sent">
					<SidebarLabel>Sent</SidebarLabel>
				</SidebarItem>
			</Sidebar>
		),
	},
]

describe('hit areas at the coarse floor', () => {
	it('lays out the 44px floor on each span', () => {
		coarseFloor()

		const { container } = renderUI(<div style={{ padding: 64 }}>{iconButton('Close')}</div>)

		const span = present(
			container.querySelector<HTMLElement>('[data-slot="touch-target"]'),
			'the hit area',
		)

		// Without the sheet, the 24px bare box would keep the 24px fine floor.
		expect(span.getBoundingClientRect().width).toBe(44)

		expect(span.getBoundingClientRect().height).toBe(44)
	})

	it.each(rows(baseline))('%s has no two hit areas that overlap', (_name, { element }) => {
		coarseFloor()

		const { container } = renderUI(element)

		expect(overlappingHitAreas(container)).toEqual([])
	})
})

describe('hit areas of packed controls', () => {
	it.each(rows(packed))(
		'%s has no two hit areas that overlap on either floor',
		(_name, { element }) => {
			const { container } = renderUI(element)

			// The case must lay out a cluster, else it checks nothing.
			expect(visibleHitAreas(container)).toBeGreaterThanOrEqual(2)

			expect(overlappingHitAreas(container)).toEqual([])

			coarseFloor()

			expect(overlappingHitAreas(container)).toEqual([])
		},
	)
})
