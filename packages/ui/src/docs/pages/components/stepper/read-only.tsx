import { Fragment } from 'react'
import { Stepper, StepperSeparator, StepperStep, StepperTitle } from 'ui/stepper'
import { steps } from './steps.ts'

export default function ReadOnly() {
	return (
		<Stepper value={1}>
			{steps.map((title, index) => (
				<Fragment key={title}>
					{index > 0 && <StepperSeparator />}
					<StepperStep value={index}>
						<StepperTitle>{title}</StepperTitle>
					</StepperStep>
				</Fragment>
			))}
		</Stepper>
	)
}
