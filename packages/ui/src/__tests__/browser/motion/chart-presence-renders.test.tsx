import { describe, expect, it } from 'vitest'
import { BarChart } from '../../../modules/chart/bar-chart'
import { ScatterChart } from '../../../modules/chart/scatter-chart'
import { fireEvent, renderUI, waitFor } from '../../helpers'
import { legendItem } from '../../helpers/chart-legend'
import { budget } from '../helpers/wall-clock'

/** Long enough for the mount reveal to end. */
const SETTLE = { timeout: budget(3000) }

const CATEGORIES = 30

const DATA = Array.from({ length: CATEGORIES }, (_, index) => ({
	label: `C${index}`,
	north: 10 + (index % 7),
	south: 5 + (index % 5),
}))

const SERIES = [
	{ xKey: 'label', yKey: 'north', yName: 'North' },
	{ xKey: 'label', yKey: 'south', yName: 'South' },
] as const

const POINTS = Array.from({ length: CATEGORIES }, (_, index) => ({
	x: index,
	north: 10 + (index % 7),
	south: 5 + (index % 5),
}))

const SCATTER = [
	{ xKey: 'x', yKey: 'north', yName: 'North' },
	{ xKey: 'x', yKey: 'south', yName: 'South' },
] as const

/** The part of a React fiber that the count reads. */
type Fiber = {
	type: unknown
	flags: number
	child: Fiber | null
	sibling: Fiber | null
	alternate: Fiber | null
}

/** React sets this flag on each fiber that rendered in the commit. */
const PERFORMED_WORK = 1

/** A Motion `m.*` element: a `forwardRef` around `MotionDOMComponent`. */
function isMotionElement(fiber: Fiber): boolean {
	const render = (fiber.type as { render?: { name?: string } } | null)?.render

	return render?.name === 'MotionDOMComponent'
}

/**
 * The Motion elements that rendered in the last commit of the root in
 * `container`. React keeps no public count, so this reads the current fiber
 * tree. A subtree that React skipped keeps the child of its old fiber, so the
 * walk does not go into it.
 */
function motionRenders(container: HTMLElement): number {
	const key = Object.keys(container).find((name) => name.startsWith('__reactContainer$'))

	const host = key ? (container as unknown as Record<string, Fiber>)[key] : undefined

	const root = (host as unknown as { stateNode: { current: Fiber } } | undefined)?.stateNode.current

	if (!root) throw new Error('expected a React root in the container')

	let count = 0

	const walk = (first: Fiber | null) => {
		for (let fiber = first; fiber; fiber = fiber.sibling) {
			const old = fiber.alternate

			const rendered = old === null || (fiber.flags & PERFORMED_WORK) !== 0

			if (rendered && isMotionElement(fiber)) count += 1

			if (old === null || fiber.child !== old.child) walk(fiber.child)
		}
	}

	walk(root.child)

	return count
}

/**
 * Points at the legend entry of `name`. `act` runs the render of the hover to
 * its commit before it returns.
 */
function pointAt(container: HTMLElement, name: string) {
	fireEvent.pointerOver(legendItem(container, name), {
		pointerType: 'mouse',
		relatedTarget: document.body,
	})
}

/**
 * A legend hover on an animated chart renders only the marks whose dim class
 * changes. Each chart `AnimatePresence` sets `presenceAffectsLayout` to false.
 * Without it, Motion gives each child a new context value on each render of
 * the presence, so each Motion element under it renders past the memo of its
 * mark. The jsdom suites mock Motion, so only a browser run with real Motion
 * can see it.
 */
describe('chart presence renders (real Motion)', () => {
	it('renders only the dimmed bars on a legend hover', async () => {
		const { container } = renderUI(
			<BarChart aria-label="Sales" data={DATA} series={[...SERIES]} width={800} animate />,
		)

		await waitFor(() => {
			expect(container.querySelectorAll('[data-slot="chart-bar"]')).toHaveLength(2 * CATEGORIES)
		}, SETTLE)

		pointAt(container, 'North')

		const renders = motionRenders(container)

		// The South bars dim, so they render, and the walk is live.
		expect(renders).toBeGreaterThan(0)

		// Only they render. Without the flag, each bar of both series renders.
		expect(renders).toBeLessThanOrEqual(CATEGORIES)
	})

	it('renders only the dimmed discs on a legend hover', async () => {
		const { container } = renderUI(
			<ScatterChart aria-label="Points" data={POINTS} series={[...SCATTER]} width={800} animate />,
		)

		await waitFor(() => {
			expect(container.querySelectorAll('[data-slot="chart-legend-item"]').length).toBeGreaterThan(
				0,
			)
		}, SETTLE)

		pointAt(container, 'North')

		const renders = motionRenders(container)

		expect(renders).toBeGreaterThan(0)

		// Only the South discs, which dim, render.
		expect(renders).toBeLessThanOrEqual(CATEGORIES)
	})
})
