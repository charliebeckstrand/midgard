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
import { words } from '../../../data/words.ts'
import { steps } from './steps.ts'

const instructions = Object.values(
	words('signup-instruction', {
		account: 'Enter your email and a password.',
		profile: 'Add your name and a photo.',
		confirm: 'Check your details.',
	}),
)

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
								<Text tone="muted">{instructions[index]}</Text>
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
