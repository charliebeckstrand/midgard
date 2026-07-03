import { act, render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { bench, describe } from 'vitest'
import { Tab, TabContent, TabContents, TabList, Tabs } from '../components/tabs'
import { BarChart } from '../modules/chart/bar-chart'
import { PieChart } from '../modules/chart/pie-chart'

/**
 * Resize cost for the chart module. A window drag delivers one
 * `ResizeObserver` notification per frame, and a chart tracks them live —
 * each changed width is one bounded geometry rebuild of that chart alone. So
 * `burst of 60` against `single notification` scales with the burst by
 * design; what must NOT appear is amplification around the charts. The
 * tab-hosted scenario is the docs-page shape — charts inside the fading tab
 * surface, whose height tracker observes the panels — and its burst must
 * cost no more than its charts' bare bursts summed: the host itself holds
 * `height: auto` through width-coupled resizes and re-renders nothing. When
 * the hosted burst outruns that sum, the host is cascading per notification
 * again — the regression this bench exists to smoke out.
 */

type StubInstance = {
	targets: Element[]
	callback: ResizeObserverCallback
}

const observers: StubInstance[] = []

// Replaces the setup shim's no-op stub: captures every observer and its
// targets so a scenario can deliver notifications by hand.
window.ResizeObserver = class CapturingResizeObserver {
	targets: Element[] = []

	callback: ResizeObserverCallback

	constructor(callback: ResizeObserverCallback) {
		this.callback = callback

		observers.push(this)
	}

	observe(el: Element) {
		this.targets.push(el)
	}

	unobserve(el: Element) {
		this.targets = this.targets.filter((target) => target !== el)
	}

	disconnect() {
		this.targets = []
	}
} as unknown as typeof ResizeObserver

/**
 * Mounts one scenario tree and scopes notification delivery to the observers
 * it constructed — every describe's tree stays mounted for the whole run, so
 * without the slice each scenario would also drive its neighbours' observers.
 */
function mountScenario(node: ReactElement) {
	const from = observers.length

	const { container } = render(node)

	const mine = observers.slice(from)

	/** One observer frame: every observed box reports a size derived from `width`. */
	function fire(width: number) {
		for (const plot of container.querySelectorAll('[data-slot="chart-plot"]')) {
			Object.defineProperty(plot, 'clientWidth', { value: width, configurable: true })
		}

		// One act per frame, all observers inside it — the browser delivers every
		// observation in a single step, then React flushes.
		act(() => {
			for (const observer of mine) {
				const entries = observer.targets.map((target) => ({
					target,
					borderBoxSize: [{ blockSize: Math.round(width / 2), inlineSize: width }],
				})) as unknown as ResizeObserverEntry[]

				observer.callback(entries, observer as unknown as ResizeObserver)
			}
		})
	}

	function burst(from: number, to: number) {
		for (let step = 1; step <= STEPS; step++) {
			fire(Math.round(from + ((to - from) * step) / STEPS))
		}
	}

	return { fire, burst }
}

/**
 * Alternating resize span, one direction per iteration, so every iteration
 * ends at a genuinely new width instead of bailing on the equality guard.
 */
function spanner() {
	let flip = false

	return () => {
		flip = !flip

		return flip ? ([600, 900] as const) : ([900, 600] as const)
	}
}

const STEPS = 60

const months = [
	{ month: 'Jan', revenue: 42, costs: 28 },
	{ month: 'Feb', revenue: 51, costs: 30 },
	{ month: 'Mar', revenue: 47, costs: 33 },
	{ month: 'Apr', revenue: 63, costs: 35 },
	{ month: 'May', revenue: 58, costs: 34 },
	{ month: 'Jun', revenue: 71, costs: 38 },
]

const sources = [
	{ source: 'Search', visits: 4820 },
	{ source: 'Direct', visits: 2210 },
	{ source: 'Referral', visits: 1370 },
	{ source: 'Social', visits: 940 },
]

function bar(label: string) {
	return (
		<BarChart
			aria-label={label}
			data={months}
			series={[
				{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
				{ xKey: 'month', yKey: 'costs', yName: 'Costs' },
			]}
		/>
	)
}

describe('BarChart · resize', () => {
	const scenario = mountScenario(bar('Revenue and costs by month'))

	const nextSpan = spanner()

	bench('burst of 60 notifications', () => {
		const [from, to] = nextSpan()

		scenario.burst(from, to)
	})

	bench('single notification', () => {
		const [, to] = nextSpan()

		scenario.fire(to)
	})
})

describe('PieChart · resize', () => {
	const scenario = mountScenario(
		<PieChart
			aria-label="Traffic by source"
			data={sources}
			series={[{ xKey: 'source', yKey: 'visits' }]}
		/>,
	)

	const nextSpan = spanner()

	bench('burst of 60 notifications', () => {
		const [from, to] = nextSpan()

		scenario.burst(from, to)
	})

	bench('single notification', () => {
		const [, to] = nextSpan()

		scenario.fire(to)
	})
})

describe('three charts in fading tab host · resize', () => {
	const scenario = mountScenario(
		<Tabs defaultValue="bar">
			<TabList aria-label="Chart kind">
				<Tab value="bar">Bar</Tab>
			</TabList>

			<TabContents>
				<TabContent value="bar">
					{bar('Revenue and costs by month')}

					{bar('Same chart again')}

					<PieChart
						aria-label="Traffic by source"
						data={sources}
						series={[{ xKey: 'source', yKey: 'visits' }]}
					/>
				</TabContent>
			</TabContents>
		</Tabs>,
	)

	const nextSpan = spanner()

	bench('burst of 60 notifications', () => {
		const [from, to] = nextSpan()

		scenario.burst(from, to)
	})

	bench('single notification', () => {
		const [, to] = nextSpan()

		scenario.fire(to)
	})
})
