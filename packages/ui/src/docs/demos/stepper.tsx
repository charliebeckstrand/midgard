'use client'

import { Fragment, useState } from 'react'
import { Button } from '../../components/button'
import {
	Stepper,
	StepperDescription,
	StepperIndicator,
	StepperSeparator,
	StepperStep,
	StepperTitle,
} from '../../components/stepper'
import { code } from '../code'
import { Example } from '../example'

export const meta = { category: 'Navigation' }

const steps = [
	{ title: 'Account', description: 'Create your account' },
	{ title: 'Profile', description: 'Add your details' },
	{ title: 'Confirm', description: 'Review and submit' },
]

export default function StepperDemo() {
	const [horizontalValue, setHorizontalValue] = useState(1)
	const [verticalValue, setVerticalValue] = useState(1)

	return (
		<div className="space-y-8">
			<Example
				title="Horizontal"
				code={code`
					import { Stepper, StepperStep, StepperIndicator, StepperTitle, StepperSeparator } from 'ui/stepper'

					const [value, setValue] = useState(1)

					<Stepper value={value} onValueChange={setValue}>
						<StepperStep value={0}>
							<StepperIndicator>1</StepperIndicator>
							<StepperTitle>Account</StepperTitle>
						</StepperStep>
						<StepperSeparator />
						<StepperStep value={1}>
							<StepperIndicator>2</StepperIndicator>
							<StepperTitle>Profile</StepperTitle>
						</StepperStep>
						<StepperSeparator />
						<StepperStep value={2}>
							<StepperIndicator>3</StepperIndicator>
							<StepperTitle>Confirm</StepperTitle>
						</StepperStep>
					</Stepper>
				`}
			>
				<div className="space-y-6">
					<Stepper value={horizontalValue} onValueChange={setHorizontalValue}>
						{steps.map((step, index) => (
							<Fragment key={step.title}>
								{index > 0 && <StepperSeparator />}
								<StepperStep value={index}>
									<StepperIndicator>{index + 1}</StepperIndicator>
									<StepperTitle>{step.title}</StepperTitle>
								</StepperStep>
							</Fragment>
						))}
					</Stepper>
					<div className="flex justify-center gap-2">
						<Button
							variant="outline"
							disabled={horizontalValue === 0}
							onClick={() => setHorizontalValue((v) => Math.max(0, v - 1))}
						>
							Back
						</Button>
						<Button
							disabled={horizontalValue === steps.length - 1}
							onClick={() => setHorizontalValue((v) => Math.min(steps.length - 1, v + 1))}
						>
							Next
						</Button>
					</div>
				</div>
			</Example>

			<Example
				title="Vertical with descriptions"
				code={code`
					<Stepper orientation="vertical" value={value} onValueChange={setValue}>
						<StepperStep value={0}>
							<StepperIndicator>1</StepperIndicator>
							<StepperTitle>Account</StepperTitle>
							<StepperDescription>Create your account</StepperDescription>
						</StepperStep>
						<StepperSeparator />
						<StepperStep value={1}>
							<StepperIndicator>2</StepperIndicator>
							<StepperTitle>Profile</StepperTitle>
							<StepperDescription>Add your details</StepperDescription>
						</StepperStep>
					</Stepper>
				`}
			>
				<Stepper orientation="vertical" value={verticalValue} onValueChange={setVerticalValue}>
					{steps.map((step, index) => (
						<Fragment key={step.title}>
							{index > 0 && <StepperSeparator />}
							<StepperStep value={index}>
								<StepperIndicator>{index + 1}</StepperIndicator>
								<StepperTitle>{step.title}</StepperTitle>
								<StepperDescription>{step.description}</StepperDescription>
							</StepperStep>
						</Fragment>
					))}
				</Stepper>
			</Example>

			<Example
				title="Read-only"
				code={code`
					<Stepper value={1}>
						<StepperStep value={0}>
							<StepperIndicator>1</StepperIndicator>
							<StepperTitle>Account</StepperTitle>
						</StepperStep>
						<StepperSeparator />
						<StepperStep value={1}>
							<StepperIndicator>2</StepperIndicator>
							<StepperTitle>Profile</StepperTitle>
						</StepperStep>
						<StepperSeparator />
						<StepperStep value={2}>
							<StepperIndicator>3</StepperIndicator>
							<StepperTitle>Confirm</StepperTitle>
						</StepperStep>
					</Stepper>
				`}
			>
				<Stepper value={1}>
					{steps.map((step, index) => (
						<Fragment key={step.title}>
							{index > 0 && <StepperSeparator />}
							<StepperStep value={index}>
								<StepperIndicator>{index + 1}</StepperIndicator>
								<StepperTitle>{step.title}</StepperTitle>
							</StepperStep>
						</Fragment>
					))}
				</Stepper>
			</Example>
		</div>
	)
}
