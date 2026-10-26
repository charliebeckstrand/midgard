import type { ReactElement } from 'react'
import { hydrateRoot, type Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { ChoroplethChart, HeatmapChart } from '../../../modules/chart'
import { act, attach, getSlot } from '../../helpers'
import { FIXTURE_GEOJSON } from '../../helpers/map-geography'

const heatmap = (
	<HeatmapChart
		aria-label="Commits"
		data={[
			{ day: 'Mon', hour: '9', commits: 1 },
			{ day: 'Mon', hour: '10', commits: 9 },
			{ day: 'Tue', hour: '9', commits: 5 },
			{ day: 'Tue', hour: '10', commits: 3 },
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
	/>
)

const choropleth = (
	<ChoroplethChart
		aria-label="Population"
		geography={FIXTURE_GEOJSON}
		legend="range"
		data={[
			{ region: 'A', pop: 0 },
			{ region: 'B', pop: 50 },
			{ region: 'C', pop: 100 },
		]}
		series={[
			{ idKey: 'region', colorKey: 'pop', colorRange: ['#dbeafe', '#1e3a8a'], colorName: 'Pop' },
		]}
	/>
)

/** The drawn axis of the bar: a vertical bar is taller than it is wide. */
function drawnAxis(track: Element): 'horizontal' | 'vertical' {
	const { width, height } = track.getBoundingClientRect()

	return width >= height ? 'horizontal' : 'vertical'
}

/** Parses the server markup of `chart` in a box `width` px wide, with no script run. */
function parseServerMarkup(chart: ReactElement, width: number): HTMLElement {
	const container = attach(document.createElement('div'))

	container.style.width = `${width}px`

	container.innerHTML = renderToString(chart)

	return container
}

/**
 * The server knows no width, so it draws a side bar (the default right
 * placement) with no measurement. The container query of the frame decides
 * the axis of the bar, at the same breakpoint at which the frame puts the bar
 * beside the plot. The first paint therefore draws the final layout: a flat
 * bar under the plot in a narrow frame, and a standing bar beside it in a wide
 * one. The hydrated chart keeps that layout when its measurement lands.
 */
describe('range legend first paint (real browser)', () => {
	it.each([
		{
			name: 'heatmap',
			chart: heatmap,
			slot: 'heatmap-range-track',
			width: 340,
			axis: 'horizontal',
		},
		{ name: 'heatmap', chart: heatmap, slot: 'heatmap-range-track', width: 600, axis: 'vertical' },
		// The map frame puts a side legend beside the map from `@lg` (512px).
		{
			name: 'choropleth',
			chart: choropleth,
			slot: 'map-range-track',
			width: 340,
			axis: 'horizontal',
		},
		{
			name: 'choropleth',
			chart: choropleth,
			slot: 'map-range-track',
			width: 460,
			axis: 'horizontal',
		},
		{
			name: 'choropleth',
			chart: choropleth,
			slot: 'map-range-track',
			width: 640,
			axis: 'vertical',
		},
	] as const)(
		'draws the $name bar $axis in a $width px box, before and after hydration',
		async ({ chart, slot, width, axis }) => {
			const container = parseServerMarkup(chart, width)

			const track = getSlot(container, slot)

			expect(drawnAxis(track)).toBe(axis)

			const before = track.getBoundingClientRect()

			const error = vi.spyOn(console, 'error')

			let root: Root | undefined

			act(() => {
				root = hydrateRoot(container, chart)
			})

			onTestFinished(() => act(() => root?.unmount()))

			// The measurement lands after hydration. Let the observer report.
			await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))

			expect(error).not.toHaveBeenCalled()

			const hydrated = getSlot(container, slot)

			expect(drawnAxis(hydrated)).toBe(axis)

			// The measurement corrects only the announced axis.
			expect(hydrated.getAttribute('aria-orientation')).toBe(axis)

			const after = hydrated.getBoundingClientRect()

			expect(after.width).toBeNear(before.width, 1)

			expect(after.height).toBeNear(before.height, 1)
		},
	)
})
