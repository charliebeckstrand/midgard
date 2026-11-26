import { Fragment, useState } from 'react'
import {
	Stepper,
	StepperDescription,
	StepperSeparator,
	StepperStep,
	StepperTitle,
} from 'ui/stepper'
import { steps, summaries } from './steps.ts'

export default function WithDescriptions() {
	const [step, setStep] = useState(0)

	return (
		<Stepper value={step} onValueChange={setStep}>
			{steps.map((title, index) => (
				<Fragment key={title}>
					{index > 0 && <StepperSeparator />}
					<StepperStep value={index}>
						<StepperTitle>{title}</StepperTitle>
						<StepperDescription>{summaries[index]}</StepperDescription>
					</StepperStep>
				</Fragment>
			))}
		</Stepper>
	)
}
