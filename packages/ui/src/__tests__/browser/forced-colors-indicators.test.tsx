import type { ReactElement } from 'react'
import { afterAll, beforeAll, describe, expect, it, onTestFinished } from 'vitest'
import { cdp, page } from 'vitest/browser'
import { ProgressBar } from '../../components/progress'
import { Segment, SegmentItem } from '../../components/segment'
import { RangeSlider, Slider } from '../../components/slider'
import { Switch } from '../../components/switch'
import { Tab, TabList, Tabs } from '../../components/tabs'
import { frames, present, renderUI } from '../helpers'

/**
 * Under forced colors, each control still shows its state. The two renders of
 * one control in two states must paint different pixels. The progress fill,
 * the tabs indicator, the active indicator, and the slider tracks and thumbs
 * draw state only with a background or a shadow, which forced colors remove.
 */
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
		const probe = document.createElement('div')
		probe.style.cssText = 'forced-color-adjust: none; background-color: Canvas'
		document.body.append(probe)
		const canvas = getComputedStyle(probe).backgroundColor
		probe.remove()
		const style = getComputedStyle(indicator)
		expect(style.backgroundColor === canvas && style.borderTopWidth === '0px').toBe(false)
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
})
