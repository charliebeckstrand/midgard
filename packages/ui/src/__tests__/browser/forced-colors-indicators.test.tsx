import type { ReactElement } from 'react'
import { afterAll, beforeAll, describe, expect, it, onTestFinished } from 'vitest'
import { cdp, page, userEvent } from 'vitest/browser'
import { Accordion, AccordionItem, AccordionTrigger } from '../../components/accordion'
import { Badge } from '../../components/badge'
import { Button } from '../../components/button'
import { ColorPicker } from '../../components/color'
import { Combobox, ComboboxOption } from '../../components/combobox'
import { DatePicker } from '../../components/date-picker'
import { Input } from '../../components/input'
import { JsonTree } from '../../components/json-tree'
import { NavItem, NavList } from '../../components/nav'
import { ProgressBar } from '../../components/progress'
import { ScrollArea } from '../../components/scroll-area'
import { Segment, SegmentItem } from '../../components/segment'
import { Select, SelectOption } from '../../components/select'
import {
	Sidebar,
	SidebarBody,
	SidebarItem,
	SidebarLabel,
	SidebarList,
} from '../../components/sidebar'
import { RangeSlider, Slider } from '../../components/slider'
import { Swatch } from '../../components/swatch'
import { Switch } from '../../components/switch'
import { Table, TableBody, TableCell, TableRow } from '../../components/table'
import { Tab, TabList, Tabs } from '../../components/tabs'
import { Timeline, TimelineItem, TimelineTitle } from '../../components/timeline'
import { Tree, TreeItem } from '../../components/tree'
import { ChatList, ChatListItem } from '../../modules/chat'
import { Grid, type GridColumn } from '../../modules/grid'
import { bySlot, frames, present, renderUI, waitFor } from '../helpers'

/**
 * Under forced colors, each control still shows its state. The two renders of
 * one control in two states must paint different pixels. The progress fill,
 * the tabs indicator, the active indicator, and the slider tracks and thumbs
 * draw state only with a background or a shadow, which forced colors remove.
 */
/** The color that forced colors give the page background. */
function canvasColor(): string {
	const probe = document.createElement('div')
	probe.style.cssText = 'forced-color-adjust: none; background-color: Canvas'
	document.body.append(probe)
	const canvas = getComputedStyle(probe).backgroundColor
	probe.remove()
	return canvas
}

async function pixels(ui: ReactElement): Promise<string> {
	const { container, unmount } = renderUI(<div style={{ padding: 8, width: 240 }}>{ui}</div>)
	await frames()
	const host = present(container.firstElementChild as HTMLElement | null, 'host')
	// The browser suite mocks `motion/react`, so the fill takes no animated
	// width. Write the width the fill animates to.
	const bar = host.querySelector('[data-slot=progress-bar]')
	const fill = bar?.firstElementChild as HTMLElement | null | undefined
	if (bar && fill) fill.style.width = `${bar.getAttribute('aria-valuenow')}%`
	await frames()
	const image = new Image()
	image.src = `data:image/png;base64,${await page.screenshot({ element: host, save: false })}`
	await image.decode()
	const canvas = document.createElement('canvas')
	canvas.width = image.width
	canvas.height = image.height
	const context = canvas.getContext('2d')
	if (!context) throw new Error('expected a 2D context')
	context.drawImage(image, 0, 0)
	const data = context.getImageData(0, 0, image.width, image.height).data
	unmount()
	let hash = 0
	for (const byte of data) hash = (hash * 31 + byte) | 0
	return `${image.width}x${image.height}:${hash}`
}

/**
 * The tab stops that show focus with the `focus.inset` ring, focused from the
 * keyboard. The ring is a box-shadow, which forced colors remove, so the
 * outline is what the cases read.
 */
const insetStops = {
	'table scroll container': {
		ui: (
			<div style={{ width: 300 }}>
				<Table tableProps={{ 'aria-label': 'Activity' }}>
					<TableBody>
						<TableRow>
							<TableCell>
								<div style={{ width: 600 }}>wide cell</div>
							</TableCell>
						</TableRow>
					</TableBody>
				</Table>
			</div>
		),
		selector: '[data-slot="table"]',
	},
	'tree row': {
		ui: (
			<Tree aria-label="Files">
				<TreeItem label="a.ts" />
			</Tree>
		),
		selector: '[role="treeitem"]',
	},
} as const

/** The computed outline of a stop after a keyboard Tab moves focus to it. */
async function focusOutline(
	name: keyof typeof insetStops,
): Promise<{ style: string; width: string }> {
	const { ui, selector } = insetStops[name]
	const { container } = renderUI(ui)
	const stop = await waitFor(() => {
		const node = present(container.querySelector<HTMLElement>(selector), name)
		expect(node.tabIndex).toBe(0)
		return node
	})
	await userEvent.tab()
	expect(document.activeElement).toBe(stop)
	const style = getComputedStyle(stop)
	return { style: style.outlineStyle, width: style.outlineWidth }
}

type Person = { id: number; name: string }

const people: Person[] = [
	{ id: 1, name: 'Alice' },
	{ id: 2, name: 'Bob' },
]

const personColumns: GridColumn<Person>[] = [
	{ id: 'name', title: 'Name', cell: (row) => row.name, value: (row) => row.name },
]

/** The control frame around a focused control. */
function controlFrame(focused: Element): Element | null {
	return focused.closest('[data-slot="control-frame"]')
}

const input = <Input aria-label="Name" />

const select = (
	<Select aria-label="Fruit">
		<SelectOption value="apple">Apple</SelectOption>
	</Select>
)

/** A focus mark: the render, the element that draws the mark, and the pseudo-element that draws it. */
type FocusMark = {
	ui: ReactElement
	mark: (focused: Element) => Element | null
	pseudo?: string
}

/**
 * The focus marks that are a box-shadow ring or a background on an element
 * other than the focused control. Forced colors remove both, so the mark must
 * also draw an outline. `mark` finds the marked element from the focused one,
 * and `pseudo` names the pseudo-element of that element that draws the mark.
 */
const focusMarks = {
	'nav row with a suffix': {
		ui: (
			<NavList aria-label="Main">
				<NavItem suffix={<span>3</span>}>Inbox</NavItem>
			</NavList>
		),
		mark: (focused: Element) => focused.closest('[data-slot="nav-item"]'),
	},
	'sidebar row with a prefix': {
		ui: (
			<Sidebar aria-label="Side">
				<SidebarBody>
					<SidebarList aria-label="Main">
						<SidebarItem prefix={<span>1</span>}>
							<SidebarLabel>Inbox</SidebarLabel>
						</SidebarItem>
					</SidebarList>
				</SidebarBody>
			</Sidebar>
		),
		mark: (focused: Element) => focused.closest('[data-slot="sidebar-item"]'),
	},
	'chat list row': {
		ui: (
			<ChatList aria-label="Conversations">
				<ChatListItem title="Kickoff" onSelect={() => {}} />
			</ChatList>
		),
		mark: (focused: Element) => focused.closest('[data-slot="chat-list-item"]'),
	},
	'grid active cell': {
		ui: <Grid navigable columns={personColumns} rows={people} getKey={(row) => row.id} />,
		mark: (focused: Element) => focused.querySelector('[role="gridcell"][data-active]'),
	},
	'accordion item': {
		ui: (
			<Accordion>
				<AccordionItem value="a">
					<AccordionTrigger>Alpha</AccordionTrigger>
				</AccordionItem>
			</Accordion>
		),
		mark: (focused: Element) => focused.closest('[data-slot="accordion-item"]'),
	},
	'json tree row': {
		ui: <JsonTree data={{ a: 1 }} />,
		mark: (focused: Element) => focused.parentElement,
	},
	'range slider thumb': {
		ui: <RangeSlider aria-label="Price" value={[10, 40]} />,
		mark: (focused: Element) => focused,
	},
	// The thumb ring of the native range is a box-shadow on a pseudo-element.
	slider: {
		ui: <Slider aria-label="Volume" value={10} />,
		mark: (focused: Element) => focused,
	},
	// The focus ring of the control frame is a box-shadow on its `::after`. The
	// `::after` draws the outline too.
	'text input in a control frame': {
		ui: input,
		mark: controlFrame,
		pseudo: '::after',
	},
	'select in a control frame': {
		ui: select,
		mark: controlFrame,
		pseudo: '::after',
	},
	'combobox in a control frame': {
		ui: (
			<Combobox aria-label="Fruit">
				<ComboboxOption value="apple">Apple</ComboboxOption>
			</Combobox>
		),
		mark: controlFrame,
		pseudo: '::after',
	},
	'date picker in a control frame': {
		ui: <DatePicker aria-label="Day" />,
		mark: controlFrame,
		pseudo: '::after',
	},
	'color picker in a control frame': {
		ui: <ColorPicker aria-label="Color" />,
		mark: controlFrame,
		pseudo: '::after',
	},
} satisfies Record<string, FocusMark>

/**
 * The computed outline of a focus mark after keyboard Tab moves focus into it.
 * The grid takes an arrow key too, so that its cursor sits on a cell.
 */
async function markOutline(
	name: keyof typeof focusMarks,
): Promise<{ style: string; width: string }> {
	const { ui, mark, pseudo }: FocusMark = focusMarks[name]
	const { unmount } = renderUI(ui)
	await frames()
	await userEvent.tab()
	const focused = present(document.activeElement, 'focused element')
	if (name === 'grid active cell') await userEvent.keyboard('{ArrowDown}')
	const node = await waitFor(() => present(mark(focused), `${name} mark`))
	const style = getComputedStyle(node, pseudo)
	const outline = { style: style.outlineStyle, width: style.outlineWidth }
	// A later render must take the next Tab.
	unmount()
	return outline
}

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
	beforeAll(() =>
		cdp().send('Emulation.setEmulatedMedia', {
			features: [{ name: 'forced-colors', value: 'active' }],
		}),
	)
	afterAll(() =>
		cdp().send('Emulation.setEmulatedMedia', { features: [{ name: 'forced-colors', value: '' }] }),
	)

	it('emulates forced colors', () => {
		expect(matchMedia('(forced-colors: active)').matches).toBe(true)
	})

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
		const canvas = canvasColor()
		const style = getComputedStyle(indicator)
		expect(style.backgroundColor === canvas && style.borderTopWidth === '0px').toBe(false)
	})

	// The viewport hides the native scrollbar, and the thumb paints only with a
	// background. Forced colors keep the alpha of that background, so a thumb
	// mapped to Canvas is Canvas over Canvas. The color of the thumb, without its
	// alpha, must not be Canvas.
	it('scroll area: the thumb paints in a color other than Canvas', async () => {
		const { container } = renderUI(
			<ScrollArea scrollbar="visible" style={{ height: 80 }} aria-label="Log">
				<div style={{ height: 400 }}>tall content</div>
			</ScrollArea>,
		)
		const thumb = await waitFor(() =>
			present(container.querySelector<HTMLElement>('[data-slot=scroll-area-thumb]'), 'thumb'),
		)
		const channels = (color: string) => color.match(/\d+/g)?.slice(0, 3).join()
		expect(channels(getComputedStyle(thumb).backgroundColor)).not.toBe(channels(canvasColor()))
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
			const canvas = canvasColor()
			const markers = [...container.querySelectorAll<HTMLElement>('[data-slot=timeline-marker]')]
			expect(markers).toHaveLength(3)
			const middle = present(markers[1], 'marker')
			expect(getComputedStyle(middle, '::before').backgroundColor).not.toBe(canvas)
			expect(getComputedStyle(middle, '::after').backgroundColor).not.toBe(canvas)
			for (const marker of markers) {
				const dot = getComputedStyle(present(marker.firstElementChild, 'dot'))
				expect(dot.backgroundColor === canvas && dot.borderTopWidth === '0px').toBe(false)
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

	it('slider: 10 and 90 paint differently', async () => {
		const low = await pixels(<Slider aria-label="Volume" value={10} />)
		const high = await pixels(<Slider aria-label="Volume" value={90} />)
		expect(high).not.toBe(low)
	})

	it('range slider: 10 to 40 and 60 to 90 paint differently', async () => {
		const low = await pixels(<RangeSlider aria-label="Price" value={[10, 40]} />)
		const high = await pixels(<RangeSlider aria-label="Price" value={[60, 90]} />)
		expect(high).not.toBe(low)
	})

	it('control: without forced colors, each pair paints differently', async () => {
		// Registered before the change, so that a failed read below still hands
		// the later cases forced colors.
		onTestFinished(async () => {
			await cdp().send('Emulation.setEmulatedMedia', {
				features: [{ name: 'forced-colors', value: 'active' }],
			})
		})
		await cdp().send('Emulation.setEmulatedMedia', {
			features: [{ name: 'forced-colors', value: '' }],
		})
		const bar = [
			await pixels(<ProgressBar aria-label="Upload" value={10} />),
			await pixels(<ProgressBar aria-label="Upload" value={90} />),
		]
		const slider = [
			await pixels(<Slider aria-label="Volume" value={10} />),
			await pixels(<Slider aria-label="Volume" value={90} />),
		]
		expect(bar[1]).not.toBe(bar[0])
		expect(slider[1]).not.toBe(slider[0])
	})

	it('inset focus: without forced colors, keyboard focus draws no outline', async () => {
		onTestFinished(async () => {
			await cdp().send('Emulation.setEmulatedMedia', {
				features: [{ name: 'forced-colors', value: 'active' }],
			})
		})
		await cdp().send('Emulation.setEmulatedMedia', {
			features: [{ name: 'forced-colors', value: '' }],
		})
		for (const name of Object.keys(insetStops) as (keyof typeof insetStops)[]) {
			expect((await focusOutline(name)).style).toBe('none')
		}
		for (const name of Object.keys(focusMarks) as (keyof typeof focusMarks)[]) {
			expect((await markOutline(name)).style, name).toBe('none')
		}
	})
})

/**
 * The Tree check box and the current row show their state with a fill, a white
 * mark, and a text color. Forced colors remove the fill and map the text to
 * `CanvasText`, and a white mark is lost on a light palette. Each case runs on
 * the light and the dark forced palette.
 */
describe.each(['light', 'dark'])(
	'tree rows show their state on a %s forced palette (real browser)',
	(scheme) => {
		beforeAll(() =>
			cdp().send('Emulation.setEmulatedMedia', {
				features: [
					{ name: 'forced-colors', value: 'active' },
					{ name: 'prefers-color-scheme', value: scheme },
				],
			}),
		)
		afterAll(() =>
			cdp().send('Emulation.setEmulatedMedia', {
				features: [
					{ name: 'forced-colors', value: '' },
					{ name: 'prefers-color-scheme', value: '' },
				],
			}),
		)

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
	},
)

/**
 * A `solid` swatch is only its `currentColor` background, and a `dashed` line is
 * only a gradient. Forced colors replace the background with `Canvas` and
 * remove the gradient. Each mark must still paint, or it disappears from the
 * legend, the tooltip, and the status dot.
 */
describe('Swatch under forced colors (real browser)', () => {
	beforeAll(() =>
		cdp().send('Emulation.setEmulatedMedia', {
			features: [{ name: 'forced-colors', value: 'active' }],
		}),
	)
	afterAll(() =>
		cdp().send('Emulation.setEmulatedMedia', { features: [{ name: 'forced-colors', value: '' }] }),
	)

	it.each(['square', 'circle', 'line'] as const)(
		'a solid %s paints a color other than Canvas',
		(shape) => {
			const { container } = renderUI(<Swatch shape={shape} color="blue" />)
			const el = present(bySlot(container, 'swatch'), 'swatch')

			expect(getComputedStyle(el).backgroundColor).not.toBe(canvasColor())
		},
	)

	it('a dashed line keeps its dash run in CanvasText', () => {
		const { container } = renderUI(<Swatch shape="line" variant="dashed" color="blue" />)
		const el = present(bySlot(container, 'swatch'), 'swatch')
		const style = getComputedStyle(el)

		expect(style.backgroundImage).toContain('repeating-linear-gradient')

		expect(style.color).not.toBe(canvasColor())
	})
})
