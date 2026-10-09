import { describe, expect, it } from 'vitest'
import { HoldButton } from '../../../components/hold-button'
import { bySlot, fireEvent, present, renderUI } from '../../helpers'
import { sampleUntil } from '../helpers/sample'
import { budget } from '../helpers/wall-clock'

/**
 * Real-Motion check of the HoldButton fill. The other suites mock `motion`, and
 * the mock records the call. The fill must grow through each scale between 0
 * and 1, and not jump to the end, on the first hold too.
 */
describe('HoldButton fill (real Motion)', () => {
	/** The horizontal scale that the fill paints now. */
	function scaleOf(fill: Element): number {
		const transform = getComputedStyle(fill).transform

		return transform === 'none' ? 1 : new DOMMatrixReadOnly(transform).a
	}

	function renderFill() {
		const { container } = renderUI(<HoldButton duration={600}>Hold</HoldButton>)

		const button = present(bySlot(container, 'hold-button'), 'the button')

		const fill = present(button.querySelector('.origin-left'), 'the fill')

		return { button, fill }
	}

	it('grows the fill through the scales between 0 and 1 on the first hold', async () => {
		const { button, fill } = renderFill()

		expect(scaleOf(fill)).toBe(0)

		const scales: number[] = []

		fireEvent.pointerDown(button, { isPrimary: true, button: 0 })

		await sampleUntil(
			() => {
				const scale = scaleOf(fill)

				scales.push(scale)

				return scale
			},
			(scale) => scale > 0.99,
			{ deadline: budget(3000) },
		)

		expect(scales.some((scale) => scale > 0.2 && scale < 0.8)).toBe(true)
	})

	it('takes the fill back to 0 from the scale it paints when the hold ends early', async () => {
		const { button, fill } = renderFill()

		fireEvent.pointerDown(button, { isPrimary: true, button: 0 })

		await sampleUntil(
			() => scaleOf(fill),
			(scale) => scale > 0.3,
			{ deadline: budget(3000) },
		)

		fireEvent.pointerUp(button, { button: 0 })

		// The reset starts from the painted scale, and does not jump to 1 first.
		expect(scaleOf(fill)).toBeLessThan(0.9)

		await sampleUntil(
			() => scaleOf(fill),
			(scale) => scale === 0,
			{ deadline: budget(3000) },
		)
	})
})
