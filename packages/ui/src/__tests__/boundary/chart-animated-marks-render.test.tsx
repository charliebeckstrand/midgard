import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BarChart } from '../../modules/chart/bar-chart'
import { ScatterChart } from '../../modules/chart/scatter-chart'
import { act, bySlot, fireEvent, renderUI } from '../helpers'

/**
 * A hover renders only the animated marks whose emphasis changed.
 *
 * The animated bars and discs rendered inline in the component that reads the
 * mark emphasis. The emphasis changes on each crossing, so each crossing
 * rendered each animated mark of the chart. Each mark is now a memoized
 * component with plain props.
 *
 * The count wraps each `motion` element, keyed by its slot. It needs a module
 * mock, so this suite sits in `boundary/`.
 */
const renders = vi.hoisted(() => new Map<string, number>())

vi.mock('motion/react', async (importActual) => {
	const actual = await importActual<typeof import('motion/react')>()

	const { createElement } = await import('react')

	// One wrapper for each tag, so each element keeps its component identity.
	const counted = new Map<string, unknown>()

	const motion = new Proxy(actual.motion, {
		get(target, tag, receiver) {
			const real = Reflect.get(target, tag, receiver)

			if (typeof tag !== 'string' || real === undefined) return real

			if (!counted.has(tag)) {
				counted.set(tag, (props: Record<string, unknown>) => {
					const slot = String(props['data-slot'] ?? tag)

					renders.set(slot, (renders.get(slot) ?? 0) + 1)

					return createElement(real, props)
				})
			}

			return counted.get(tag)
		},
	})

	return { ...actual, motion }
})

const DATA = Array.from({ length: 12 }, (_, index) => ({ m: `M${index}`, a: 100, b: 90 }))

const SERIES = [
	{ xKey: 'm', yKey: 'a', yName: 'A' },
	{ xKey: 'm', yKey: 'b', yName: 'B' },
] as const

/** Moves the pointer to `x` on the plot, and returns the renders of `slot` that it caused. */
function move(container: HTMLElement, x: number, slot: string, y = 150) {
	renders.clear()

	act(() => {
		fireEvent.pointerMove(bySlot(container, 'chart-hit') as Element, { clientX: x, clientY: y })
	})

	return renders.get(slot) ?? 0
}

describe('animated chart mark renders', () => {
	beforeEach(() => {
		renders.clear()
	})

	it('renders only the two bars that swap emphasis on a crossing', () => {
		const { container } = renderUI(
			<BarChart aria-label="Bars" data={DATA} series={[...SERIES]} width={400} animate />,
		)

		// The first bar of the second month in series A.
		move(container, 50, 'chart-bar')

		// Its twin in series B: one bar dims and one lights, of 24.
		expect(move(container, 60, 'chart-bar')).toBeLessThanOrEqual(2)
	})

	it('renders only the two discs that swap emphasis on a crossing', () => {
		const points = Array.from({ length: 12 }, (_, index) => ({
			x: index * 10,
			y: (index % 4) * 25 + 10,
		}))

		const { container } = renderUI(
			<ScatterChart
				aria-label="Discs"
				data={points}
				series={[{ xKey: 'x', yKey: 'y', yName: 'Y' }]}
				width={400}
				animate
			/>,
		)

		// The disc at x = 30, then straight onto the disc at x = 20.
		move(container, 60, 'chart-scatter-point', 30)

		expect(move(container, 40, 'chart-scatter-point', 70)).toBeLessThanOrEqual(2)
	})
})
