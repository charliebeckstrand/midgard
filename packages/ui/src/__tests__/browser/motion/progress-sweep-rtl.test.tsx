import { describe, expect, it } from 'vitest'
import { ProgressBar } from '../../../components/progress'
import { LocaleProvider } from '../../../providers/locale'
import { present, renderUI } from '../../helpers'
import { pause } from '../helpers/wall-clock'

/**
 * The indeterminate sweep runs from the inline start to the inline end. In a
 * right-to-left region the fill rests at the right edge, so the sweep starts
 * past the right edge and ends past the left edge.
 */
describe('ProgressBar sweep direction (real browser)', () => {
	it.each([
		['ltr', 1],
		['rtl', -1],
	] as const)('sweeps toward the inline end under %s', async (dir, sign) => {
		const { container } = renderUI(
			<LocaleProvider dir={dir}>
				<ProgressBar aria-label="Loading" />
			</LocaleProvider>,
		)

		const fill = present(
			container.querySelector<HTMLElement>('[data-slot=progress-bar] > div'),
			'fill',
		)

		const center = () => {
			const box = fill.getBoundingClientRect()

			return (box.left + box.right) / 2
		}

		// The loop jumps back once per lap, so most steps, not every step, go
		// toward the inline end.
		const samples: number[] = []

		for (let i = 0; i < 10; i++) {
			samples.push(center())

			// The sweep moves on wall clock, so the hold samples it at a fixed step.
			await pause(100)
		}

		const steps = samples
			.slice(1)
			.map((sample, index) => Math.sign(sample - (samples[index] ?? sample)))

		expect(steps.filter((step) => step === sign).length).toBeGreaterThan(steps.length / 2)
	})
})
