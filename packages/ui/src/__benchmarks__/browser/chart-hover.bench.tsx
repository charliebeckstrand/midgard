/**
 * Pointer-tracking cost on a live chart: one iteration sweeps a synthetic
 * pointer across the plot in `SWEEP` steps and then settles one animation
 * frame, so hit-testing, crosshair/tooltip work, and any frame-deferred
 * drawing all land inside the timed region. Every contender receives the
 * same `pointermove` + `mousemove` pair per step — each library listens for
 * one of the two and ignores the other, so the dispatch overhead is
 * symmetric even though their interaction stacks differ (the ui module and
 * AG hear pointer events, Highcharts mouse events).
 */

import { bench, describe } from 'vitest'
import { type Contender, lineContenders, scatterContenders } from './contenders'
import { makePoints, makeTrend } from './fixtures'

const SWEEP = 20

type PreparedHover = { name: string; run: () => Promise<void> }

/** The plot-covering element each library actually listens on. */
function hoverTarget(host: HTMLElement): Element {
	return (
		host.querySelector('[data-slot="chart-hit"]') ??
		host.querySelector('canvas') ??
		host.querySelector('.highcharts-container') ??
		host
	)
}

/** Mounts every contender and closes each over a sweep across its own plot. */
async function prepare<D>(contenders: Contender<D>[], data: D): Promise<PreparedHover[]> {
	const prepared: PreparedHover[] = []

	for (const contender of contenders) {
		const host = document.createElement('div')

		document.body.append(host)

		await contender.mount(host, data)

		const target = hoverTarget(host)

		prepared.push({
			name: contender.name,
			run: async () => {
				const rect = target.getBoundingClientRect()

				const y = rect.top + rect.height / 2

				for (let step = 0; step < SWEEP; step++) {
					const x = rect.left + 40 + ((rect.width - 60) * step) / (SWEEP - 1)

					const at = { bubbles: true, clientX: x, clientY: y }

					target.dispatchEvent(new PointerEvent('pointermove', { ...at, pointerType: 'mouse' }))

					target.dispatchEvent(new MouseEvent('mousemove', at))
				}

				await new Promise(requestAnimationFrame)
			},
		})
	}

	return prepared
}

const line1k = await prepare(lineContenders(1), makeTrend(1_000, 1))

const points10k = await prepare(scatterContenders(), makePoints(10_000))

describe('hover · line · 1,000 × 1 series · 20-step sweep', () => {
	for (const { name, run } of line1k) {
		bench(name, run)
	}
})

describe('hover · scatter · 10,000 points · 20-step sweep', () => {
	for (const { name, run } of points10k) {
		bench(name, run)
	}
})
