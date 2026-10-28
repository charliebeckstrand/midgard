import { Fragment } from 'react'
import { describe, expect, it, onTestFinished } from 'vitest'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbSeparator,
} from '../../components/breadcrumb'
import { breadcrumbFit } from '../../components/breadcrumb/breadcrumb-fit-rule'
import { BarChart } from '../../modules/chart/bar-chart'
import { frames, getSlot, present, renderUI, waitFor } from '../helpers'

/**
 * Content that a measurement of its box sizes, while the box narrows in steps, one in each
 * frame, as a rail that slides open beside it makes. A plain `setState` from the observer
 * committed the new reading a frame after the paint, so each step painted the content at the
 * reading of the step before. `observeResizeBeforePaint` commits it before the paint.
 *
 * A probe observer, made after the observer of the content, runs after it in each delivery.
 * It thus reads the layout that the frame paints.
 */

/** Records `read()` in each delivery of an observer of `target` until the test finishes. */
function probe<T>(target: Element, read: () => T): T[] {
	const readings: T[] = []

	const observer = new ResizeObserver(() => readings.push(read()))

	observer.observe(target)

	onTestFinished(() => observer.disconnect())

	return readings
}

/** Sets the width of `rail` to each of `widths`, one in each animation frame. */
async function slide(rail: HTMLElement, widths: readonly number[]) {
	for (const width of widths) {
		await new Promise<void>((resolve) =>
			requestAnimationFrame(() => {
				rail.style.width = `${width}px`

				resolve()
			}),
		)
	}

	await frames()
}

/** A row of a rail and the content, `width` pixels wide. */
function Row({ width, children }: { width: number; children: React.ReactNode }) {
	return (
		<div style={{ display: 'flex', width }}>
			<div data-testid="rail" style={{ flexShrink: 0, width: 0 }} />
			<div style={{ flex: 1, minWidth: 0 }}>{children}</div>
		</div>
	)
}

const STEPS = [56, 112, 168, 224]

describe('content sized from a measurement of its box, on a resize (real browser)', () => {
	it('draws a chart at the width of its plot in the frame that narrows it', async () => {
		const { container } = renderUI(
			<Row width={800}>
				<BarChart
					aria-label="Revenue by month"
					data={[
						{ month: 'Jan', revenue: 42 },
						{ month: 'Feb', revenue: 51 },
						{ month: 'Mar', revenue: 47 },
					]}
					series={[{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' }]}
				/>
			</Row>,
		)

		const plot = getSlot(container, 'chart-plot')

		const drawing = () => present<SVGSVGElement>(plot.querySelector('svg'), 'svg')

		await waitFor(() => expect(drawing().width.baseVal.value).toBe(plot.clientWidth))

		const gaps = probe(plot, () => drawing().width.baseVal.value - plot.clientWidth)

		await slide(
			present(container.querySelector<HTMLElement>('[data-testid="rail"]'), 'rail'),
			STEPS,
		)

		expect(gaps.length).toBeGreaterThan(1)

		expect(gaps.every((gap) => gap === 0)).toBe(true)
	})

	it('collapses a breadcrumb for the width of its row in the frame that narrows it', async () => {
		const crumbs = ['Places', 'United States of America', 'Oregon', 'Portland']

		const { container } = renderUI(
			<Row width={560}>
				<Breadcrumb collapse>
					<BreadcrumbList>
						{crumbs.map((crumb, index) => (
							<Fragment key={crumb}>
								{index > 0 && <BreadcrumbSeparator />}
								<BreadcrumbItem>
									<BreadcrumbLink href={`/${crumb}`} current={index === crumbs.length - 1}>
										{crumb}
									</BreadcrumbLink>
								</BreadcrumbItem>
							</Fragment>
						))}
					</BreadcrumbList>
				</Breadcrumb>
			</Row>,
		)

		const nav = getSlot(container, 'breadcrumb')

		const closed = () =>
			Array.from(
				nav.querySelectorAll<HTMLElement>('[data-slot=breadcrumb-label]'),
				(label) => label.clientWidth === 0,
			).filter(Boolean).length

		await waitFor(() => expect(closed()).toBe(breadcrumbFit(nav)))

		const readings = probe(nav, () => ({ shown: closed(), fit: breadcrumbFit(nav) }))

		await slide(
			present(container.querySelector<HTMLElement>('[data-testid="rail"]'), 'rail'),
			[80, 160, 240, 320],
		)

		expect(readings.length).toBeGreaterThan(1)

		// The steps narrow the row past at least one crumb.
		expect(readings.at(-1)?.fit).toBeGreaterThan(readings[0]?.fit ?? 0)

		for (const { shown, fit } of readings) expect(shown).toBe(fit)
	})
})
