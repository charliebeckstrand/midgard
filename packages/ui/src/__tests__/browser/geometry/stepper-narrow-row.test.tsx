import { Fragment } from 'react'
import { describe, expect, it } from 'vitest'
import {
	Stepper,
	StepperDescription,
	StepperSeparator,
	StepperStep,
	StepperTitle,
} from '../../../components/stepper'
import { renderUI } from '../../helpers'

const STEPS = [
	['Account', 'Create your account'],
	['Profile', 'Add your details'],
	['Confirm', 'Review and submit'],
] as const

/**
 * A horizontal Stepper in a row narrower than its steps. Each step held its
 * `w-32`, and the negative margins of the separators pulled the steps over each
 * other, so the descriptions of two steps ran together.
 */
describe('Stepper: horizontal row narrower than its steps', () => {
	it('keeps a gap between the boxes of two steps', () => {
		const { container } = renderUI(
			<div style={{ width: 340 }}>
				<Stepper value={1} orientation="horizontal">
					{STEPS.map(([title, description], index) => (
						<Fragment key={title}>
							{index > 0 && <StepperSeparator />}
							<StepperStep value={index}>
								<StepperTitle>{title}</StepperTitle>
								<StepperDescription>{description}</StepperDescription>
							</StepperStep>
						</Fragment>
					))}
				</Stepper>
			</div>,
		)

		const boxes = [...container.querySelectorAll('[data-slot="stepper-step"]')].map((step) =>
			step.getBoundingClientRect(),
		)

		expect(boxes).toHaveLength(3)

		for (const [index, box] of boxes.entries()) {
			const next = boxes[index + 1]

			if (next) expect(next.left - box.right).toBeGreaterThanOrEqual(15)
		}

		const row = container.querySelector('[data-slot="stepper"]')?.getBoundingClientRect()

		expect(boxes.at(-1)?.right).toBeLessThanOrEqual(row?.right ?? 0)
	})
})
