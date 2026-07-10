/**
 * Pointer-tracking cost on a live map: one iteration sweeps a synthetic
 * pointer across the plot in `SWEEP` steps and settles one animation frame,
 * so hit-testing, region emphasis, tooltip work, and any frame-deferred
 * drawing all land inside the timed region. Every contender receives the same
 * `pointermove` + `mousemove` pair per step; the dispatch target differs the
 * way the libraries' interaction stacks do. Highcharts and ECharts listen on
 * their container and hit-test from coordinates, so their target is the
 * container for every step. The ui module's regions are their own hit
 * targets — the browser retargets a real pointer to the path under it, native
 * SVG hit-testing no contender pays in script time — so its per-step targets
 * are resolved to the region under each step once, outside the timed region.
 */

import { bench, describe } from 'vitest'
import type { Contender } from './contenders'
import { zoneMapContenders } from './map-contenders'
import { countiesAtlas, makeZones, statesAtlas, type ZoneData } from './map-fixtures'

const SWEEP = 20

type PreparedHover = { name: string; run: () => Promise<void> }

/** The plot-covering element each library draws into and listens on. */
function plotTarget(host: HTMLElement): Element {
	return (
		host.querySelector('[data-slot="map-plot"] svg') ??
		host.querySelector('canvas') ??
		host.querySelector('.highcharts-container') ??
		host
	)
}

/**
 * The per-step dispatch targets. Where the contender renders per-region hit
 * targets (the ui module), each step resolves to the region under its point —
 * by bounding box, smallest match winning, so an enclosing giant stays behind
 * its neighbours — standing in for the browser's native retargeting of a real
 * pointer. The coordinate-listening contenders take the plot itself each step.
 */
function sweepTargets(host: HTMLElement, plot: Element, xs: number[], y: number): Element[] {
	const regions = [...host.querySelectorAll('[data-slot="map-region"]')]

	if (regions.length === 0) return xs.map(() => plot)

	const rects = regions.map((region) => region.getBoundingClientRect())

	return xs.map((x) => {
		let target: Element = plot

		let area = Number.POSITIVE_INFINITY

		for (const [index, rect] of rects.entries()) {
			const inside = x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom

			if (inside && rect.width * rect.height < area) {
				target = regions[index] as Element

				area = rect.width * rect.height
			}
		}

		return target
	})
}

/** Mounts every contender and closes each over a sweep across its own plot. */
async function prepare(
	contenders: Contender<ZoneData>[],
	data: ZoneData,
): Promise<PreparedHover[]> {
	const prepared: PreparedHover[] = []

	for (const contender of contenders) {
		const host = document.createElement('div')

		document.body.append(host)

		await contender.mount(host, data)

		const plot = plotTarget(host)

		const rect = plot.getBoundingClientRect()

		const y = rect.top + rect.height / 2

		const xs = Array.from(
			{ length: SWEEP },
			(_, step) => rect.left + 40 + ((rect.width - 60) * step) / (SWEEP - 1),
		)

		const targets = sweepTargets(host, plot, xs, y)

		prepared.push({
			name: contender.name,
			run: async () => {
				for (const [step, x] of xs.entries()) {
					const at = { bubbles: true, clientX: x, clientY: y }

					const target = targets[step] as Element

					target.dispatchEvent(new PointerEvent('pointermove', { ...at, pointerType: 'mouse' }))

					target.dispatchEvent(new MouseEvent('mousemove', at))
				}

				await new Promise(requestAnimationFrame)
			},
		})
	}

	return prepared
}

// A settled sweep runs tens of milliseconds, so the default 500ms window takes
// too few samples to separate signal from noise; the longer window matches the
// chart hover bench's.
const WINDOW = { time: 2_500 }

const states = await prepare(zoneMapContenders(statesAtlas), makeZones(statesAtlas))

const counties = await prepare(zoneMapContenders(countiesAtlas), makeZones(countiesAtlas))

describe('hover · map · states · 20-step sweep', () => {
	for (const { name, run } of states) {
		bench(name, run, WINDOW)
	}
})

describe('hover · map · counties · 20-step sweep', () => {
	for (const { name, run } of counties) {
		bench(name, run, WINDOW)
	}
})
