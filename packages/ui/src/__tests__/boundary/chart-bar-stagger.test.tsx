import type { ElementType } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { BarChart } from '../../modules/chart/bar-chart'
import { renderUI } from '../helpers'

/**
 * The grow stagger of an animated bar run stays within a beat, however long the
 * run. Motion writes the delay into its own timeline, so jsdom cannot read it.
 * The suite reads the `transition` prop that each bar takes instead. It needs a
 * module mock, so it sits in `boundary/`.
 */
const delays = vi.hoisted(() => [] as number[])

vi.mock('motion/react-m', async (importActual) => {
	const actual = await importActual<typeof import('motion/react-m')>()

	const { createElement } = await import('react')

	// One wrapper for each tag, so each element keeps its component identity.
	return Object.fromEntries(
		(Object.entries(actual) as [string, ElementType][]).map(([tag, real]) => [
			tag,
			tag === 'create'
				? real
				: (props: Record<string, unknown>) => {
						const transition = props.transition as { delay?: number } | undefined

						if (props['data-slot'] === 'chart-bar') delays.push(transition?.delay ?? 0)

						return createElement(real, props)
					},
		]),
	)
})

function bars(count: number) {
	return (
		<BarChart
			aria-label="Daily totals"
			data={Array.from({ length: count }, (_, index) => ({ day: `D${index}`, total: index + 1 }))}
			series={[{ xKey: 'day', yKey: 'total', yName: 'Total' }]}
			width={800}
			animate
		/>
	)
}

describe('the animated bar grow stagger', () => {
	it('spans at most a beat over a long run, still in order', () => {
		// The step was 50ms a bar, so the last of 365 bars started after 18s.
		delays.length = 0

		renderUI(bars(365))

		expect(delays.length).toBeGreaterThanOrEqual(365)

		const run = delays.slice(-365)

		expect(Math.max(...run)).toBeLessThanOrEqual(0.6)

		expect(run.every((delay, index) => index === 0 || delay > (run[index - 1] ?? 0))).toBe(true)
	})

	it('keeps the full step for a short run', () => {
		delays.length = 0

		renderUI(bars(4))

		const run = delays.slice(-4)

		expect(run).toHaveLength(4)

		run.forEach((delay, index) => {
			expect(delay).toBeCloseTo(index * 0.05)
		})
	})
})
