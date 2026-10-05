import { Fragment, useState } from 'react'
import { Button } from 'ui/button'
import { Card } from 'ui/card'
import { Flex } from 'ui/flex'
import {
	Stepper,
	StepperPanel,
	StepperPanels,
	StepperSeparator,
	StepperStep,
	StepperTitle,
} from 'ui/stepper'
import { Text } from 'ui/text'
import { steps } from './steps.ts'

export default function WithContentPanels() {
	const [step, setStep] = useState(0)

	return (
		<>
			<Stepper value={step} onValueChange={setStep}>
				{steps.map((title, index) => (
					<Fragment key={title}>
						{index > 0 && <StepperSeparator />}
						<StepperStep value={index}>
							<StepperTitle>{title}</StepperTitle>
						</StepperStep>
					</Fragment>
				))}
				<StepperPanels>
					{steps.map((title, index) => (
						<StepperPanel key={title} value={index}>
							<Card>
								<Text tone="muted">{title} content goes here.</Text>
							</Card>
						</StepperPanel>
					))}
				</StepperPanels>
			</Stepper>
			<Flex gap="sm">
				<Button variant="outline" disabled={step === 0} onClick={() => setStep(step - 1)}>
					Back
				</Button>
				<Button disabled={step === steps.length - 1} onClick={() => setStep(step + 1)}>
					Next
				</Button>
			</Flex>
		</>
	)
}
