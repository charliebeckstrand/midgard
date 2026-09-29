import { describe, expect, it, vi } from 'vitest'
import { LineChart } from '../../modules/chart/line-chart'
import { renderUI, stubMatchMedia } from '../helpers'

/**
 * A reduced-motion reader gets the line marks at rest on mount.
 *
 * The reduced-motion config of motion skips a transform, but the line draw
 * (`pathLength`) and the point pop (`r`) are no transform. The marks therefore
 * must skip their `initial` state themselves. Motion writes the SVG values
 * after the render, so jsdom cannot read them. The suite reads the `initial`
 * prop that each `motion` element takes instead, keyed by its slot. It needs a
 * module mock, so it sits in `boundary/`.
 */
const initials = vi.hoisted(() => new Map<string, unknown[]>())

vi.mock('motion/react', async (importActual) => {
	const actual = await importActual<typeof import('motion/react')>()

	const { createElement } = await import('react')

	// One wrapper for each tag, so each element keeps its component identity.
	const wrapped = new Map<string, unknown>()

	const motion = new Proxy(actual.motion, {
		get(target, tag, receiver) {
			const real = Reflect.get(target, tag, receiver)

			if (typeof tag !== 'string' || real === undefined) return real

			if (!wrapped.has(tag)) {
				wrapped.set(tag, (props: Record<string, unknown>) => {
					const slot = String(props['data-slot'] ?? tag)

					initials.set(slot, [...(initials.get(slot) ?? []), props.initial])

					return createElement(real, props)
				})
			}

			return wrapped.get(tag)
		},
	})

	return { ...actual, motion }
})

const DATA = [
	{ q: 'Q1', v: 10 },
	{ q: 'Q2', v: 30 },
	{ q: 'Q3', v: 20 },
]

function chart() {
	return (
		<LineChart
			aria-label="Revenue"
			data={DATA}
			series={[{ xKey: 'q', yKey: 'v', yName: 'Revenue' }]}
			width={400}
			animate
			points
		/>
	)
}

describe('animated line marks under reduced motion', () => {
	it('mounts the stroke and the points at rest', () => {
		initials.clear()

		stubMatchMedia((query) => query === '(prefers-reduced-motion: reduce)')

		renderUI(chart())

		// The count is live, so the checks below can fail.
		expect(initials.get('chart-point')?.length).toBeGreaterThan(0)

		expect(initials.get('chart-point')?.at(-1)).toBe(false)

		expect(initials.get('chart-line')?.at(-1)).toBe(false)
	})

	it('keeps the reveal for a reader who does not ask for reduced motion', () => {
		initials.clear()

		stubMatchMedia(() => false)

		renderUI(chart())

		expect(initials.get('chart-point')?.at(-1)).toEqual({ r: 0, opacity: 0 })

		expect(initials.get('chart-line')?.at(-1)).toEqual({ pathLength: 0 })
	})
})
