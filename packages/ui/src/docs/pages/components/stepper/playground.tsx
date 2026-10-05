import { Fragment } from 'react'
import { Stepper, type StepperProps, StepperSeparator, StepperStep, StepperTitle } from 'ui/stepper'
import { steps } from './steps.ts'

export default function StepperPlayground(props: StepperProps) {
	return (
		<Stepper defaultValue={1} {...props}>
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
