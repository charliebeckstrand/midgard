import type { ReactElement } from 'react'
import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Badge } from '../../../components/badge'
import { Button } from '../../../components/button'
import { Checkbox } from '../../../components/checkbox'
import { ColorPanel, ColorPicker } from '../../../components/color'
import { Control } from '../../../components/control'
import { DatePicker } from '../../../components/date-picker'
import { HoldButton } from '../../../components/hold-button'
import { Input } from '../../../components/input'
import { JsonTree } from '../../../components/json-tree'
import { List, ListItem } from '../../../components/list'
import { LoadingDots } from '../../../components/loading'
import { NavItem, NavList } from '../../../components/nav'
import { PasswordStrength } from '../../../components/password-strength'
import { ProgressBar } from '../../../components/progress'
import { Rating } from '../../../components/rating'
import { Segment, SegmentItem } from '../../../components/segment'
import {
	Sidebar,
	SidebarBody,
	SidebarItem,
	SidebarLabel,
	SidebarList,
} from '../../../components/sidebar'
import { RangeSlider, Slider } from '../../../components/slider'
import { Swatch } from '../../../components/swatch'
import { Switch } from '../../../components/switch'
import { Tab, TabList, Tabs } from '../../../components/tabs'
import { Timeline, TimelineItem, TimelineTitle } from '../../../components/timeline'
import { Tree, TreeItem } from '../../../components/tree'
import { HeatmapChart } from '../../../modules/chart'
import { ChatList, ChatListItem } from '../../../modules/chat'
import { Dashboard, DashboardTile } from '../../../modules/dashboard'
import { Grid } from '../../../modules/grid'
import {
	Kanban,
	KanbanCard,
	KanbanCardHandle,
	KanbanColumn,
	KanbanColumnBody,
} from '../../../modules/kanban'
import { MapPoints } from '../../../modules/map'
import { createGroup, QueryBuilder, type QueryRule } from '../../../modules/query'
import { bySlot, frames, getSlot, present, renderUI, waitFor } from '../../helpers'
import { categoricalPlat, overlayPlat } from '../../helpers/map-plat'
import { showsOnCanvas, systemColor } from '../helpers/forced-colors'
import {
	focusMarks,
	focusOutline,
	input,
	insetStops,
	markOutline,
	people,
	personColumns,
	pixels,
	select,
} from '../helpers/forced-indicators'

/**
 * Under forced colors, each control still shows its state, and each focus mark
 * draws an outline. Forced colors replace a background and remove a box-shadow,
 * and many states and focus marks draw with only those. The `forced-light` and
 * the `forced-dark` instances run each case. The fine half,
 * `../forced-colors-indicators.test.tsx`, shows that each read here is a result
 * of forced colors.
 */

/**
 * The current rows that carry an affix. The active indicator is the top surface
 * of the row, so it covers the outline of the row. Under forced colors the
 * indicator always draws an edge, so focus must change that edge.
 */
const currentRows = {
	'nav row': (
		<NavList aria-label="Main">
			<NavItem current suffix={<span>3</span>}>
				Inbox
			</NavItem>
		</NavList>
	),
	'sidebar row': (
		<Sidebar aria-label="Side">
			<SidebarBody>
				<SidebarList aria-label="Main">
					<SidebarItem current suffix={<span>3</span>}>
						<SidebarLabel>Inbox</SidebarLabel>
					</SidebarItem>
				</SidebarList>
			</SidebarBody>
		</Sidebar>
	),
	'chat list row': (
		<ChatList aria-label="Conversations">
			<ChatListItem title="Kickoff" current onSelect={() => {}} />
		</ChatList>
	),
} as const

/** The controls in a control frame, which draws their focus outline. */
const controls: Record<string, ReactElement> = {
	input,
	select,
}

/** The parts whose resting edge is a kiso ring. */
const edges: Record<string, ReactElement> = {
	'input frame': input,
	'outline button': <Button variant="outline">Save</Button>,
	'outline badge': <Badge variant="outline">New</Badge>,
	// A solid or a soft fill is the only edge, and forced colors remove it.
	'solid button': <Button>Save</Button>,
	'soft button': <Button variant="soft">Save</Button>,
	'solid badge': <Badge>New</Badge>,
	'soft badge': <Badge variant="soft">New</Badge>,
}

/** The outline of the active indicator, as one string. */
function indicatorOutline(container: HTMLElement): string {
	const indicator = present(
		container.querySelector<HTMLElement>('[data-slot=active-indicator]'),
		'indicator',
	)
	const style = getComputedStyle(indicator)
	return `${style.outlineStyle} ${style.outlineWidth} ${style.outlineColor}`
}

describe('controls show their state under forced colors (real browser)', () => {
	it('progress bar: 10% and 90% paint differently', async () => {
		const low = await pixels(<ProgressBar aria-label="Upload" value={10} />)
		const high = await pixels(<ProgressBar aria-label="Upload" value={90} />)
		expect(high).not.toBe(low)
	})

	it('switch: on and off paint differently', async () => {
		const on = await pixels(<Switch aria-label="On" checked onChange={() => {}} />)
		const off = await pixels(<Switch aria-label="On" checked={false} onChange={() => {}} />)
		expect(on).not.toBe(off)
	})

	// The pixels of two tab lists differ even here: the Canvas-colored
	// indicator covers the list's bottom rule under the selected tab. So the
	// check reads the indicator's own paint, which must not be the page Canvas.
	it('tabs: the indicator paints in a color other than Canvas', async () => {
		const { container } = renderUI(
			<Tabs value="a" onValueChange={() => {}}>
				<TabList aria-label="Sections">
					<Tab value="a">Alpha</Tab>
					<Tab value="b">Bravo</Tab>
				</TabList>
			</Tabs>,
		)
		const tab = present(container.querySelector('[data-slot=tab][aria-selected=true]'), 'tab')
		const indicator = present(tab.parentElement?.children[1], 'indicator')
		const style = getComputedStyle(indicator)
		expect(!showsOnCanvas(style.backgroundColor) && style.borderTopWidth === '0px').toBe(false)
	})

	// The focus marker of an underline tab is a background on `::after`, which
	// forced colors remove, and the tab sets `outline-none`. The focused tab must
	// still draw an outline.
	it('tabs: a keyboard-focused tab draws an outline', async () => {
		const { container } = renderUI(
			<Tabs value="a" onValueChange={() => {}}>
				<TabList aria-label="Sections">
					<Tab value="a">Alpha</Tab>
					<Tab value="b">Bravo</Tab>
				</TabList>
			</Tabs>,
		)
		await userEvent.keyboard('{Tab}')
		const tab = present(container.querySelector('[data-slot=tab][aria-selected=true]'), 'tab')
		expect(document.activeElement).toBe(tab)
		const style = getComputedStyle(tab)
		expect(style.outlineStyle).not.toBe('none')
		expect(style.outlineWidth).not.toBe('0px')
	})

	// The active indicator marks the current item of a segment, a sidebar, a nav,
	// pagination, a stepper and a chat list. One case per host is not needed:
	// all of them render the one primitive.
	it('active indicator: the pill draws an edge', () => {
		const { container } = renderUI(
			<Segment value="a" onValueChange={() => {}} aria-label="View">
				<SegmentItem value="a">Alpha</SegmentItem>
				<SegmentItem value="b">Bravo</SegmentItem>
			</Segment>,
		)
		const indicator = present(container.querySelector('[data-slot=active-indicator]'), 'indicator')
		expect(getComputedStyle(indicator).outlineStyle).not.toBe('none')
	})

	// The range legend track paints only with a gradient, which forced colors
	// remove, so the slider keeps an outline.
	it('range legend: the track draws an edge', () => {
		const { container } = renderUI(
			<HeatmapChart
				aria-label="Commits"
				data={[
					{ day: 'Mon', hour: '9', commits: 1 },
					{ day: 'Tue', hour: '9', commits: 5 },
				]}
				series={[
					{
						xKey: 'hour',
						yKey: 'day',
						colorKey: 'commits',
						colorRange: ['#f7fee7', '#365314'],
						colorName: 'Commits',
					},
				]}
				width={400}
			/>,
		)
		const track = present(container.querySelector('[data-slot=heatmap-range-track]'), 'track')
		const style = getComputedStyle(track)
		expect(style.backgroundImage).toBe('none')
		expect(style.outlineStyle).not.toBe('none')
		expect(Number.parseFloat(style.outlineWidth)).toBeGreaterThan(0)
	})

	// The rails are pseudo-element backgrounds, and a solid dot is a background.
	// The middle row has both rails. Each rail and each dot must paint in a
	// color other than Canvas.
	it.each(['solid', 'outline'] as const)(
		'timeline (%s): the rails and the dots paint',
		(variant) => {
			const { container } = renderUI(
				<Timeline variant={variant}>
					<TimelineItem>
						<TimelineTitle>Alpha</TimelineTitle>
					</TimelineItem>
					<TimelineItem status="active" lineBefore="red" lineAfter="blue">
						<TimelineTitle>Bravo</TimelineTitle>
					</TimelineItem>
					<TimelineItem color="green">
						<TimelineTitle>Charlie</TimelineTitle>
					</TimelineItem>
				</Timeline>,
			)
			const markers = [...container.querySelectorAll<HTMLElement>('[data-slot=timeline-marker]')]
			expect(markers).toHaveLength(3)
			const middle = present(markers[1], 'marker')
			expect(showsOnCanvas(getComputedStyle(middle, '::before').backgroundColor)).toBe(true)
			expect(showsOnCanvas(getComputedStyle(middle, '::after').backgroundColor)).toBe(true)
			for (const marker of markers) {
				const dot = getComputedStyle(present(marker.firstElementChild, 'dot'))
				expect(!showsOnCanvas(dot.backgroundColor) && dot.borderTopWidth === '0px').toBe(false)
			}
		},
	)

	for (const name of Object.keys(insetStops) as (keyof typeof insetStops)[]) {
		it(`${name}: keyboard focus draws an outline`, async () => {
			const outline = await focusOutline(name)
			expect(outline.style).not.toBe('none')
			expect(outline.width).not.toBe('0px')
		})
	}

	for (const name of Object.keys(focusMarks) as (keyof typeof focusMarks)[]) {
		it(`${name}: keyboard focus draws an outline`, async () => {
			const outline = await markOutline(name)
			expect(outline.style).not.toBe('none')
			expect(outline.width).not.toBe('0px')
		})
	}

	// The frame draws the focus outline, so the control in it draws none. Two
	// outlines would draw a double edge.
	it.each(Object.entries(controls))(
		'%s: the focused control draws no outline',
		async (_name, ui) => {
			renderUI(ui)
			await frames()
			await userEvent.tab()
			expect(getComputedStyle(present(document.activeElement, 'focused')).outlineStyle).toBe('none')
		},
	)

	// A resting edge is a 1 px ring, which forced colors remove. The outline of
	// the kiso ring keeps the edge.
	it.each(Object.entries(edges))('%s: the resting edge draws an outline', async (name, ui) => {
		const { container } = renderUI(<div>{ui}</div>)
		await frames()
		const node = present(container.firstElementChild?.firstElementChild, name)
		const host = bySlot(node, 'control-frame') ?? node
		const style = getComputedStyle(host)
		expect(style.outlineStyle).not.toBe('none')
		expect(style.outlineWidth).not.toBe('0px')
	})

	for (const name of Object.keys(currentRows) as (keyof typeof currentRows)[]) {
		it(`current ${name} with an affix: keyboard focus changes the indicator edge`, async () => {
			const { container } = renderUI(currentRows[name])
			await frames()
			const rest = indicatorOutline(container)
			await userEvent.tab()
			expect(indicatorOutline(container)).not.toBe(rest)
		})
	}

	// The open picker moves DOM focus over the days. The selected day is a solid
	// Button, whose resting outline is 1 px under forced colors. The focus ring
	// must stay 2 px on it, as on a plain day.
	it('date picker: the focus ring of a day is 2 px on the selected day too', async () => {
		renderUI(<DatePicker aria-label="Day" defaultValue={new Date(2024, 2, 10)} />)

		await frames()
		await userEvent.tab()
		await userEvent.keyboard('{Enter}')
		await frames()

		const focused = () => present(document.activeElement as HTMLElement | null, 'focused day')

		const widths: Record<string, string> = {}

		for (const key of ['{ArrowLeft}', '{ArrowRight}']) {
			await userEvent.keyboard(key)
			await frames()

			const day = focused()

			widths[`${day.textContent} ${day.getAttribute('aria-selected')}`] =
				getComputedStyle(day).outlineWidth
		}

		expect(widths).toEqual({ '10 true': '2px', '9 false': '2px' })
	})

	// The shadow and the surface show a held node. Forced colors remove the
	// shadow and repaint the surface, so a keyboard lift showed no change.
	it('query builder: a node that the keyboard lifts draws an outline', async () => {
		const rule = (id: string): QueryRule => ({
			id,
			type: 'rule',
			combinator: 'and',
			field: 'name',
			operator: 'contains',
			value: id,
		})
		const { container } = renderUI(
			<QueryBuilder
				fields={[{ name: 'name', label: 'Name', type: 'text' }]}
				defaultValue={createGroup('and', [rule('a'), rule('b')])}
				reorder
			/>,
		)
		await frames()
		const node = present(
			container.querySelector<HTMLElement>('[data-slot=query-sortable][data-node-id=a]'),
			'node',
		)
		expect(getComputedStyle(node).outlineStyle).toBe('none')
		present(bySlot(node, 'query-reorder-handle'), 'grip').focus()
		await userEvent.keyboard(' ')
		await expect.poll(() => node.hasAttribute('data-dragging')).toBe(true)
		const style = getComputedStyle(node)
		expect(style.outlineStyle).toBe('solid')
		expect(style.outlineWidth).toBe('2px')
		await userEvent.keyboard('{Escape}')
	})

	// A lift shows with a shadow and a violet focus accent. Forced colors remove
	// the shadow and force the accent to `Highlight`, so a lifted row, card, or
	// tile looked the same as a focused one. A lift draws a 4 px outline, twice
	// the width of a focus outline.
	describe('a keyboard lift draws a 4 px outline', () => {
		const outline = (node: HTMLElement) => {
			const style = getComputedStyle(node)
			return `${style.outlineStyle} ${style.outlineWidth}`
		}

		const rows = [
			{ id: 'a', label: 'Alpha' },
			{ id: 'b', label: 'Bravo' },
		]

		it('list: a row that holds the focus', async () => {
			const { container } = renderUI(
				<List items={rows} getKey={(item) => item.id} onReorder={() => {}}>
					{(item) => <ListItem>{item.label}</ListItem>}
				</List>,
			)
			// The rows mount again when the `Reorder` group arrives, so each read
			// finds the row again.
			const row = () =>
				present(container.querySelector<HTMLElement>('[data-slot=list-item]'), 'row')
			await userEvent.tab()
			expect(document.activeElement).toBe(row())
			expect(outline(row())).toBe('solid 2px')
			await userEvent.keyboard(' ')
			await expect.poll(() => row().hasAttribute('data-lifted')).toBe(true)
			expect(outline(row())).toBe('solid 4px')
			await userEvent.keyboard('{Escape}')
		})

		it('list: a row whose content holds the focus', async () => {
			const { container } = renderUI(
				<List items={rows} getKey={(item) => item.id} onReorder={() => {}}>
					{(item) => <ListItem onClick={() => {}}>{item.label}</ListItem>}
				</List>,
			)
			// The rows mount again when the `Reorder` group arrives, so each read
			// finds the row again.
			const row = () =>
				present(container.querySelector<HTMLElement>('[data-slot=list-item]'), 'row')
			await userEvent.tab()
			expect(row().contains(document.activeElement)).toBe(true)
			expect(getComputedStyle(row()).outlineStyle).toBe('none')
			await userEvent.keyboard(' ')
			await expect.poll(() => row().hasAttribute('data-lifted')).toBe(true)
			expect(outline(row())).toBe('solid 4px')
			await userEvent.keyboard('{Escape}')
		})

		it('kanban: a card', async () => {
			const { container } = renderUI(
				<Kanban
					columns={[{ id: 'todo', items: rows }]}
					getKey={(item: (typeof rows)[number]) => item.id}
					onReorder={() => {}}
					aria-label="Board"
				>
					<KanbanColumn value="todo" aria-label="Todo">
						<KanbanColumnBody>
							{rows.map((item) => (
								<KanbanCard key={item.id} value={item.id}>
									<KanbanCardHandle />
									<span>{item.label}</span>
								</KanbanCard>
							))}
						</KanbanColumnBody>
					</KanbanColumn>
				</Kanban>,
			)
			const card = present(container.querySelector<HTMLElement>('[data-slot=kanban-card]'), 'card')
			const before = outline(card)
			present(bySlot(card, 'kanban-card-handle'), 'handle').focus()
			await userEvent.keyboard(' ')
			await expect.poll(() => card.hasAttribute('data-lifted')).toBe(true)
			expect(before).not.toBe('solid 4px')
			expect(outline(card)).toBe('solid 4px')
			await userEvent.keyboard('{Escape}')
		})

		it('dashboard: a tile', async () => {
			const { container } = renderUI(
				<div style={{ width: 800 }}>
					<Dashboard
						aria-label="Sales"
						editing
						layout={{
							defaultValue: [
								{ id: 'a', x: 0, y: 0, w: 12, h: 8 },
								{ id: 'b', x: 12, y: 0, w: 12, h: 8 },
							],
						}}
					>
						<DashboardTile id="a" title="Revenue" />
						<DashboardTile id="b" title="Orders" />
					</Dashboard>
				</div>,
			)
			await frames()
			const grip = present(
				container.querySelector<HTMLElement>('[data-slot=dashboard-handle]'),
				'grip',
			)
			const card = present(grip.closest<HTMLElement>('[data-slot=card]'), 'card')
			expect(outline(card)).not.toBe('solid 4px')
			grip.focus()
			await userEvent.keyboard(' ')
			await expect.poll(() => card.hasAttribute('data-dragging')).toBe(true)
			expect(outline(card)).toBe('solid 4px')
			await userEvent.keyboard('{Escape}')
		})
	})

	it('slider: 10 and 90 paint differently', async () => {
		const low = await pixels(<Slider aria-label="Volume" value={10} />)
		const high = await pixels(<Slider aria-label="Volume" value={90} />)
		expect(high).not.toBe(low)
	})

	// Forced colors make red, amber, and green one color, so only the invalid
	// state keeps a mark: an outline in place of the red ring.
	it.each([
		['input', <Input key="input" aria-label="Name" />],
		['checkbox', <Checkbox key="checkbox" aria-label="Agree" />],
		['slider', <Slider key="slider" aria-label="Volume" value={10} />],
		['range slider', <RangeSlider key="range" aria-label="Price" value={[10, 40]} />],
		['rating', <Rating key="rating" aria-label="Score" />],
	] as const)('%s: an invalid control paints differently', async (_name, ui) => {
		const valid = await pixels(<Control>{ui}</Control>)
		const invalid = await pixels(<Control severity="error">{ui}</Control>)
		expect(invalid).not.toBe(valid)
	})

	// The browser suite mocks `motion/react`, so a hold moves no fill. Write the
	// scale of the fill half way through a hold.
	it('hold button: a hold half way through paints differently from rest', async () => {
		const ui = <HoldButton onHoldComplete={() => {}}>Delete</HoldButton>
		const rest = await pixels(ui)
		const held = await pixels(ui, (host) => {
			const fill = present(
				host.querySelector<HTMLElement>('[data-slot=hold-button] [style*=scaleX]'),
				'fill',
			)
			fill.style.transform = 'scaleX(0.5)'
		})
		expect(held).not.toBe(rest)
	})

	it('range slider: 10 to 40 and 60 to 90 paint differently', async () => {
		const low = await pixels(<RangeSlider aria-label="Price" value={[10, 40]} />)
		const high = await pixels(<RangeSlider aria-label="Price" value={[60, 90]} />)
		expect(high).not.toBe(low)
	})

	// A cell of the range shows by a tint and an outline. Forced colors remove
	// the tint, so the outline must hold the mark. The second render strips the
	// flag of each cell of the range, so only the mark of the range differs.
	it('grid range: the cells of the range paint differently from the same cells with no range', async () => {
		const ui = (
			<Grid
				navigable
				range={{
					defaultValue: {
						anchor: { rowKey: 1, columnId: 'name' },
						focus: { rowKey: 2, columnId: 'name' },
					},
				}}
				columns={personColumns}
				rows={people}
				getKey={(row) => row.id}
			/>
		)

		const marked = await pixels(ui)

		const plain = await pixels(ui, (host) => {
			const cells = host.querySelectorAll('[data-in-range]')

			expect(cells).toHaveLength(2)

			for (const cell of cells) cell.removeAttribute('data-in-range')
		})

		expect(plain).not.toBe(marked)
	})

	// The fill handle shows by its background and a border. Forced colors replace
	// the background with Canvas, so the handle must keep an edge in a color other
	// than Canvas. A pixel diff is not enough: a Canvas square over the outline
	// of the active cell changes pixels and still shows no handle.
	it('grid fill handle: paints an edge or a fill in a color other than Canvas', async () => {
		const { container } = renderUI(
			<Grid
				range={{
					defaultValue: {
						anchor: { rowKey: 1, columnId: 'name' },
						focus: { rowKey: 1, columnId: 'name' },
					},
				}}
				columns={personColumns.map((column) => ({ ...column, field: 'name' as const }))}
				rows={people}
				getKey={(row) => row.id}
				editable={{ session: 'managed', onCommit: () => {} }}
			/>,
		)

		const handle = await waitFor(() => getSlot(container, 'grid-fill-handle'))

		const style = getComputedStyle(handle)

		const fill = showsOnCanvas(style.backgroundColor)

		const edge = style.borderTopWidth !== '0px' && showsOnCanvas(style.borderTopColor)

		expect(fill || edge).toBe(true)
	})
})

/**
 * The Tree check box and the current row show their state with a fill, a white
 * mark, and a text color. Forced colors remove the fill and map the text to
 * `CanvasText`, and a white mark is lost on a light palette. The `forced-light`
 * and the `forced-dark` instances run each case, so it runs on the two forced
 * palettes.
 */
describe('tree rows show their state under forced colors (real browser)', () => {
	const row = (props: { checked?: boolean | 'mixed'; current?: boolean }) => (
		<Tree aria-label="Files">
			<TreeItem label="a.ts" onCheckedChange={() => {}} {...props} />
		</Tree>
	)

	it('check box: checked, mixed, and unchecked paint differently', async () => {
		const off = await pixels(row({ checked: false }))
		const on = await pixels(row({ checked: true }))
		const mixed = await pixels(row({ checked: 'mixed' }))
		expect(on).not.toBe(off)
		expect(mixed).not.toBe(off)
		expect(mixed).not.toBe(on)
	})

	it('current row: paints differently from another row', async () => {
		const other = await pixels(row({}))
		const current = await pixels(row({ current: true }))
		expect(current).not.toBe(other)
	})
})

/**
 * A `solid` swatch is only its `currentColor` background, and a `dashed` line is
 * only a gradient. Forced colors replace the background with `Canvas` and
 * remove the gradient. Each mark must still paint, or it disappears from the
 * legend, the tooltip, and the status dot.
 */
describe('Swatch under forced colors (real browser)', () => {
	it.each(['square', 'circle', 'line'] as const)(
		'a solid %s paints a color other than Canvas',
		(shape) => {
			const { container } = renderUI(<Swatch shape={shape} color="blue" />)
			const el = present(bySlot(container, 'swatch'), 'swatch')

			expect(showsOnCanvas(getComputedStyle(el).backgroundColor)).toBe(true)
		},
	)

	it('a dashed line keeps its dash run in CanvasText', () => {
		const { container } = renderUI(<Swatch shape="line" variant="dashed" color="blue" />)
		const el = present(bySlot(container, 'swatch'), 'swatch')
		const style = getComputedStyle(el)

		expect(style.backgroundImage).toContain('repeating-linear-gradient')

		expect(showsOnCanvas(style.color)).toBe(true)
	})
})

/**
 * The parts of a color panel and the swatch of a color picker show a color, so
 * they keep their real color under forced colors. A system color in its place
 * would make every preset chip alike and remove the hue track.
 */
describe('color parts under forced colors (real browser)', () => {
	it('the preset chips keep their colors', () => {
		const { container } = renderUI(
			<ColorPanel defaultValue="#00ff00" swatches={['#ff0000', '#0000ff']} />,
		)
		const [red, blue] = [...container.querySelectorAll('[data-slot="color-swatch"]')].map(
			(chip) => getComputedStyle(chip).backgroundColor,
		)

		expect(red).toBe('rgb(255, 0, 0)')

		expect(blue).toBe('rgb(0, 0, 255)')
	})

	it('the hue track keeps its gradient, and the area keeps its hue', () => {
		const { container } = renderUI(<ColorPanel defaultValue="#ff0000" swatches={false} />)
		const hue = present(container.querySelector('[data-channel="hue"]'), 'hue track')
		const area = present(bySlot(container, 'color-area'), 'area')

		expect(getComputedStyle(hue).backgroundImage).toContain('linear-gradient')

		expect(getComputedStyle(area).backgroundColor).toBe('rgb(255, 0, 0)')
	})

	it('the swatch of the picker keeps its color', () => {
		const { container } = renderUI(<ColorPicker aria-label="Color" defaultValue="#0000ff" />)
		const swatch = present(bySlot(container, 'color-picker-swatch'), 'swatch')
		const fill = present(swatch.firstElementChild, 'fill')

		expect(getComputedStyle(fill).backgroundColor).toBe('rgb(0, 0, 255)')
	})
})

/** Whether an element in `container` paints the background `color`, a system color. */
function paints(container: Element, color: string): boolean {
	const fill = systemColor(color)
	return [...container.querySelectorAll('*')].some(
		(el) => getComputedStyle(el).backgroundColor === fill,
	)
}

/** Whether an element in `container` paints the `Highlight` of a `mark`. */
const paintsMark = (container: Element) => paints(container, 'Highlight')

/**
 * A search match of a JsonTree, the filled segments of a password-strength
 * meter, and the dots of LoadingDots show their state only with a background.
 * Forced colors remove it, so a filled segment paints the `Highlight` of a
 * `mark`, and a dot paints the `CanvasText` of a shape. A match is a wash
 * behind text, so it paints the `Mark` of a `highlight`, which keeps the
 * contrast of the text on it.
 */
describe('state marks under forced colors (real browser)', () => {
	it('JsonTree: a search match paints the highlight, and no match paints none', () => {
		const data = { alpha: 1, beta: 2 }
		const match = renderUI(<JsonTree data={data} search="alpha" />)
		expect(paints(match.container, 'Mark')).toBe(true)
		match.unmount()
		const none = renderUI(<JsonTree data={data} />)
		expect(paints(none.container, 'Mark')).toBe(false)
	})

	it('LoadingDots: each dot paints CanvasText', () => {
		const { container } = renderUI(<LoadingDots />)
		const dots = container.querySelectorAll<HTMLElement>('[data-slot=loading-dot]')
		expect(dots.length).toBeGreaterThan(0)
		for (const dot of dots) {
			expect(getComputedStyle(dot).backgroundColor).toBe(systemColor('CanvasText'))
		}
	})

	it('password strength: a filled segment paints the mark, and an empty meter paints none', () => {
		const weak = renderUI(<PasswordStrength value="a" showRules={false} />)
		expect(paintsMark(weak.container)).toBe(true)
		weak.unmount()
		const empty = renderUI(<PasswordStrength value="" showRules={false} />)
		expect(paintsMark(empty.container)).toBe(false)
	})
})

/**
 * The marks of a map under forced colors. The `forced-light` and the
 * `forced-dark` instances run each case, in a light and a dark forced palette.
 *
 * Chromium keeps the authored fill and stroke of an SVG under forced colors
 * (`forced-color-adjust: preserve-parent-color`). So the region fills, the
 * selection outline of a region, and the halo of a picked mark keep their
 * colors. The outline and the halo draw over the region fills, which keep their
 * colors too, so each part stays apart from what is under it. The plot is an
 * HTML element, so its focus ring takes `Highlight`.
 *
 * A browser that removed the region fills would still leave each value in the
 * data table of the map, which holds every value of the choropleth. Thus a
 * region color is not the only carrier of its value.
 */
describe('map under forced colors (real browser)', () => {
	/** The computed stroke of the first shape in the slot `slot`. */
	const readStroke = (slot: string) => {
		const group = present(bySlot(document.body, slot), slot)

		const shape = group.matches('path,circle') ? group : group.querySelector('path,circle')

		return getComputedStyle(present(shape, `${slot} shape`))
	}

	it('keeps the fill of each category apart, and apart from a region with no data', () => {
		const { container } = renderUI(categoricalPlat())

		const fills = Array.from(
			present(bySlot(container, 'map-regions'), 'regions').querySelectorAll('path'),
			(path) => getComputedStyle(path).fill,
		).filter((fill) => fill !== 'none')

		// Two categories and one region with no data.
		expect(new Set(fills).size).toBe(3)
	})

	it('draws the outline of a selected region apart from its fill', async () => {
		renderUI(categoricalPlat({ selectedRegions: ['A'] }))

		await waitFor(() => expect(bySlot(document.body, 'map-region-selected')).not.toBeNull())

		const outline = readStroke('map-region-selected')

		const fill = getComputedStyle(
			present(bySlot(document.body, 'map-regions')?.querySelector('path'), 'region A'),
		).fill

		expect(outline.stroke).not.toBe('none')

		expect(outline.stroke).not.toBe(fill)

		expect(Number.parseFloat(outline.strokeWidth)).toBeGreaterThan(0)
	})

	it('draws the halo of a picked mark wider than the mark, in another color', async () => {
		renderUI(
			overlayPlat(
				<MapPoints id="places" label="Places" points={[{ label: 'Depot', at: [8, 5] }]} />,
				{ selectedOverlays: [{ id: 'places', index: 0 }] },
			),
		)

		await waitFor(() => expect(bySlot(document.body, 'map-points-selected')).not.toBeNull())

		const halo = readStroke('map-points-selected')

		const dot = readStroke('map-points-dot')

		expect(halo.stroke).not.toBe('none')

		expect(halo.stroke).not.toBe(dot.stroke)

		expect(Number.parseFloat(halo.strokeWidth)).toBeGreaterThan(Number.parseFloat(dot.strokeWidth))
	})

	it('draws the focus ring of the plot in Highlight', () => {
		renderUI(categoricalPlat())

		const plot = present(bySlot(document.body, 'map-plot'), 'plot')

		// The ring is a `:focus-visible` ring. A script focus matches
		// `:focus-visible` only when the focus before it did, and a pointer
		// press of an earlier test on the shared page clears that. So the
		// focus asks for the match itself.
		plot.focus({ focusVisible: true } as FocusOptions)

		const style = getComputedStyle(plot)

		expect(style.outlineStyle).toBe('solid')

		expect(style.outlineWidth).toBe('2px')

		expect(style.outlineColor).toBe(systemColor('Highlight'))
	})
})
