import type { ReactElement } from 'react'
import { afterAll, beforeAll, describe, expect, it, onTestFinished } from 'vitest'
import { cdp, page, userEvent } from 'vitest/browser'
import { ProgressBar } from '../../components/progress'
import { Segment, SegmentItem } from '../../components/segment'
import { RangeSlider, Slider } from '../../components/slider'
import { Switch } from '../../components/switch'
import { Table, TableBody, TableCell, TableRow } from '../../components/table'
import { Tab, TabList, Tabs } from '../../components/tabs'
import { Timeline, TimelineItem, TimelineTitle } from '../../components/timeline'
import { Tree, TreeItem } from '../../components/tree'
import { frames, present, renderUI, waitFor } from '../helpers'

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
