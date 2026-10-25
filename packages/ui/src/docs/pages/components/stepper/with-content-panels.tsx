import { Fragment, useRef, useState } from 'react'
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
import { instructions, steps } from './steps.ts'

export default function WithContentPanels() {
	const [step, setStep] = useState(0)

	const backRef = useRef<HTMLButtonElement>(null)

	const nextRef = useRef<HTMLButtonElement>(null)

	// A press onto the first or the last step disables its button, so it gives the
	// focus to the other button first.
	const back = () => {
		if (step === 1) nextRef.current?.focus()

		setStep(step - 1)
	}

	const next = () => {
		if (step === steps.length - 2) backRef.current?.focus()

		setStep(step + 1)
	}

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
				<Button ref={backRef} variant="outline" disabled={step === 0} onClick={back}>
					Back
				</Button>
				<Button ref={nextRef} disabled={step === steps.length - 1} onClick={next}>
					Next
				</Button>
			</Flex>
		</>
	)
}
