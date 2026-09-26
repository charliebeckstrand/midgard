import { afterEach, describe, expect, it } from 'vitest'
import { ScatterChart } from '../../modules/chart/scatter-chart'
import { bySlot, present, renderUI } from '../helpers'

/**
 * The ring around a scatter dot takes the fill of the surface under the chart, in both modes.
 *
 * The ring was white in both modes. In dark mode, each dot then showed a white halo. The ring
 * now reads `--surface-fill`, and it falls back to the page ground.
 *
 * Rides the real browser because the claim is a computed color: jsdom loads no stylesheet.
 */
describe('the scatter marker ring (real browser)', () => {
	afterEach(() => {
		document.documentElement.classList.remove('dark')
	})

	const POINTS = [
		{ x: 1, y: 12 },
		{ x: 2, y: 91 },
		{ x: 3, y: 44 },
	]

	/** The computed stroke of the dots, and the fill of the card they sit on. */
	function ringOnCard(dark: boolean) {
		if (dark) document.documentElement.classList.add('dark')

		const { container } = renderUI(
			<div
				data-testid="card"
				className="bg-white [--surface-fill:var(--color-white)] dark:bg-zinc-900 dark:[--surface-fill:var(--color-zinc-900)]"
			>
				<ScatterChart
					aria-label="Scatter"
					data={POINTS}
					series={[{ xKey: 'x', yKey: 'y' }]}
					width={300}
					height={200}
				/>
			</div>,
		)

		const discs = present(bySlot(container, 'chart-scatter-discs'), 'scatter discs')

		const card = present(container.querySelector('[data-testid="card"]'), 'card')

		return { ring: getComputedStyle(discs).stroke, card: getComputedStyle(card).backgroundColor }
	}

	it('matches the card fill in light mode', () => {
		const { ring, card } = ringOnCard(false)

		expect(ring).toBe(card)
	})

	it('matches the card fill in dark mode', () => {
		const { ring, card } = ringOnCard(true)

		expect(ring).toBe(card)
	})
})
