import type { ReactElement } from 'react'
import { expect, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { Accordion, AccordionItem, AccordionTrigger } from '../../../components/accordion'
import { ColorPicker } from '../../../components/color'
import { Combobox, ComboboxOption } from '../../../components/combobox'
import { DatePicker } from '../../../components/date-picker'
import { Input } from '../../../components/input'
import { JsonTree } from '../../../components/json-tree'
import { NavItem, NavList } from '../../../components/nav'
import { Select, SelectOption } from '../../../components/select'
import {
	Sidebar,
	SidebarBody,
	SidebarItem,
	SidebarLabel,
	SidebarList,
} from '../../../components/sidebar'
import { RangeSlider, Slider } from '../../../components/slider'
import { Table, TableBody, TableCell, TableRow } from '../../../components/table'
import { Tree, TreeItem } from '../../../components/tree'
import { LineChart } from '../../../modules/chart'
import { ChatList, ChatListItem } from '../../../modules/chat'
import { Grid, type GridColumn } from '../../../modules/grid'
import { frames, present, renderUI, waitFor } from '../../helpers'

/**
 * The renders and the reads of `forced/forced-colors-indicators.test.tsx` and of
 * its fine half, `forced-colors-indicators.test.tsx`. The forced half runs in
 * the `forced-light` and the `forced-dark` instances, and the fine half runs in
 * the `browser` instance. Each half reads the same controls.
 */

/**
 * A hash of the pixels that `ui` paints. Two renders of one control in two
 * states must paint different pixels. The progress fill, the hold fill, the
 * tabs indicator, the active indicator, and the slider tracks and thumbs draw
 * state only with a background or a shadow, which forced colors remove.
 */
export async function pixels(
	ui: ReactElement,
	prepare?: (host: HTMLElement) => void,
): Promise<string> {
	const { container, unmount } = renderUI(<div style={{ padding: 8, width: 240 }}>{ui}</div>)
	await frames()
	const host = present(container.firstElementChild as HTMLElement | null, 'host')
	// The browser suite mocks `motion/react`, so the fill takes no animated
	// width. Write the width the fill animates to.
	const bar = host.querySelector('[data-slot=progress-bar]')
	const fill = bar?.firstElementChild as HTMLElement | null | undefined
	if (bar && fill) fill.style.width = `${bar.getAttribute('aria-valuenow')}%`
	prepare?.(host)
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
export const insetStops = {
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
export const focusOutline = vi.defineHelper(
	async (name: keyof typeof insetStops): Promise<{ style: string; width: string }> => {
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
	},
)

type Person = { id: number; name: string }

export const people: Person[] = [
	{ id: 1, name: 'Alice' },
	{ id: 2, name: 'Bob' },
]

export const personColumns: GridColumn<Person>[] = [
	{ id: 'name', title: 'Name', cell: (row) => row.name, value: (row) => row.name },
]

/** The control frame around a focused control. */
function controlFrame(focused: Element): Element | null {
	return focused.closest('[data-slot="control-frame"]')
}

export const input = <Input aria-label="Name" />

export const select = (
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
export const focusMarks = {
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
	// The focus ring of the chart plot is a box-shadow on its `::after`, over the
	// drawing (`focus.overlay`). The `::after` draws the outline too.
	'chart plot': {
		ui: (
			<LineChart
				aria-label="Signups"
				data={[
					{ week: 'W1', a: 1 },
					{ week: 'W2', a: 3 },
				]}
				series={[{ xKey: 'week', yKey: 'a', yName: 'A' }]}
				width={400}
			/>
		),
		mark: (focused: Element) => focused.closest('[data-slot="chart-plot"]'),
		pseudo: '::after',
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
export async function markOutline(
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
