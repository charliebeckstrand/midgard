import { describe, expect, it } from 'vitest'
import { Stepper, StepperIndicator, StepperStep, StepperTitle } from '../../components/stepper'
import { renderUI } from '../helpers'

/**
 * A Stepper whose indicators show the step numbers. The current step paints
 * its `ActiveIndicator` fill at `z-10`, and the number painted under the fill,
 * so the current step showed an empty blue dot.
 */
describe('StepperIndicator: content on the current step', () => {
	it('paints the content of the current indicator above its fill', () => {
		const { container } = renderUI(
			<Stepper value={1} onValueChange={() => {}} orientation="horizontal">
				{[0, 1, 2].map((index) => (
					<StepperStep key={index} value={index}>
						<StepperIndicator>{index + 1}</StepperIndicator>
						<StepperTitle>Step {index + 1}</StepperTitle>
					</StepperStep>
				))}
			</Stepper>,
		)

		const indicator = container.querySelector<HTMLElement>(
			'[aria-current="step"] [data-slot="stepper-indicator"]',
		)

		const fill = indicator?.querySelector<HTMLElement>('[data-slot="active-indicator"]')

		const number = [...(indicator?.childNodes ?? [])]
			.flatMap((node) => (node.nodeType === Node.TEXT_NODE ? [node] : [...node.childNodes]))
			.find((node) => node.nodeType === Node.TEXT_NODE && node.textContent === '2')

		if (!fill || !number) throw new Error('missing fill or number')

		// The fill does not take a press, so the hit test skips it. Let it take
		// one, so that the hit test reads the paint order at the number.
		fill.style.pointerEvents = 'auto'

		const range = document.createRange()

		range.selectNodeContents(number)

		const box = range.getBoundingClientRect()

		const top = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)

		expect(top).not.toBe(fill)
		expect(top && indicator?.contains(top)).toBe(true)

		// The number reads in white on the blue fill.
		expect(getComputedStyle(number.parentElement as HTMLElement).color).toBe('rgb(255, 255, 255)')
	})
})
