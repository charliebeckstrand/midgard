'use client'

import { Fragment, useState } from 'react'
import { Alert, AlertDescription } from '../../components/alert'
import {
	Stepper,
	StepperDescription,
	StepperPanel,
	StepperPanels,
	StepperSeparator,
	StepperStep,
	StepperTitle,
} from '../../components/stepper'
import { code } from '../code'
import { Example } from '../example'
import { ValueStepper } from '../value-stepper'

export const meta = { category: 'Navigation' }

const steps = [
	{ title: 'Account', description: 'Create your account' },
	{ title: 'Profile', description: 'Add your details' },
	{
		title: 'Confirm',
		description: 'Review your information and submit',
	},
]

export default function StepperDemo() {
	const [horizontalValue, setHorizontalValue] = useState(1)
	const [verticalValue, setVerticalValue] = useState(1)
	const [linearValue, setLinearValue] = useState(0)
	const [panelsValue, setPanelsValue] = useState(0)

	return (
		<div className="space-y-8">
			<Alert type="info" closable>
				<AlertDescription>
					When <code>orientation</code> isn't explicitly set, the stepper falls back to 'vertical'
					on mobile.
				</AlertDescription>
			</Alert>

			<Example
				title="Horizontal"
				actions={
					<ValueStepper
						value={horizontalValue}
						onChange={setHorizontalValue}
						max={steps.length - 1}
					/>
				}
				code={code`
					import { Stepper, StepperStep, StepperTitle, StepperSeparator } from 'ui/stepper'

					const [value, setValue] = useState(1)

					<Stepper value={value} onValueChange={setValue}>
						<StepperStep value={0}>
							<StepperTitle>Account</StepperTitle>
						</StepperStep>
						<StepperSeparator />
						<StepperStep value={1}>
							<StepperTitle>Profile</StepperTitle>
						</StepperStep>
						<StepperSeparator />
						<StepperStep value={2}>
							<StepperTitle>Confirm</StepperTitle>
						</StepperStep>
					</Stepper>
				`}
			>
				<Stepper value={horizontalValue} onValueChange={setHorizontalValue}>
					{steps.map((step, index) => (
						<Fragment key={step.title}>
							{index > 0 && <StepperSeparator />}
							<StepperStep value={index}>
								<StepperTitle>{step.title}</StepperTitle>
							</StepperStep>
						</Fragment>
					))}
				</Stepper>
			</Example>

			<Example
				title="Vertical"
				actions={
					<ValueStepper value={verticalValue} onChange={setVerticalValue} max={steps.length - 1} />
				}
				code={code`
					<Stepper orientation="vertical" value={value} onValueChange={setValue}>
						<StepperStep value={0}>
							<StepperTitle>Account</StepperTitle>
							<StepperDescription>Create your account</StepperDescription>
						</StepperStep>
						<StepperSeparator />
						<StepperStep value={1}>
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
								<StepperTitle>{step.title}</StepperTitle>
								<StepperDescription>{step.description}</StepperDescription>
							</StepperStep>
						</Fragment>
					))}
				</Stepper>
			</Example>

			<Example
				title="Linear"
				actions={
					<ValueStepper value={linearValue} onChange={setLinearValue} max={steps.length - 1} />
				}
				code={code`
					// Upcoming steps render as <button disabled>; only the buttons
					// outside the stepper can advance the value.
					<Stepper linear value={value} onValueChange={setValue}>
						<StepperStep value={0}>
							<StepperTitle>Account</StepperTitle>
						</StepperStep>
						<StepperSeparator />
						<StepperStep value={1}>
							<StepperTitle>Profile</StepperTitle>
						</StepperStep>
						<StepperSeparator />
						<StepperStep value={2}>
							<StepperTitle>Confirm</StepperTitle>
						</StepperStep>
					</Stepper>
				`}
			>
				<Stepper linear value={linearValue} onValueChange={setLinearValue}>
					{steps.map((step, index) => (
						<Fragment key={step.title}>
							{index > 0 && <StepperSeparator />}
							<StepperStep value={index}>
								<StepperTitle>{step.title}</StepperTitle>
							</StepperStep>
						</Fragment>
					))}
				</Stepper>
			</Example>

			<Example
				title="With content panels"
				actions={
					<ValueStepper value={panelsValue} onChange={setPanelsValue} max={steps.length - 1} />
				}
				code={code`
					<Stepper value={value} onValueChange={setValue}>
						<StepperStep value={0}>
							<StepperTitle>Account</StepperTitle>
						</StepperStep>
						<StepperSeparator />
						<StepperStep value={1}>
							<StepperTitle>Profile</StepperTitle>
						</StepperStep>
						<StepperSeparator />
						<StepperStep value={2}>
							<StepperTitle>Confirm</StepperTitle>
						</StepperStep>

						<StepperPanels>
							<StepperPanel value={0}>Account form</StepperPanel>
							<StepperPanel value={1}>Profile form</StepperPanel>
							<StepperPanel value={2}>Review and submit</StepperPanel>
						</StepperPanels>
					</Stepper>
				`}
			>
				<Stepper value={panelsValue} onValueChange={setPanelsValue}>
					{steps.map((step, index) => (
						<Fragment key={step.title}>
							{index > 0 && <StepperSeparator />}
							<StepperStep value={index}>
								<StepperTitle>{step.title}</StepperTitle>
							</StepperStep>
						</Fragment>
					))}
					<StepperPanels>
						{steps.map((step, index) => (
							<StepperPanel key={step.title} value={index}>
								<div className="rounded-md border border-zinc-200 p-4 text-sm text-zinc-500 dark:border-zinc-800">
									{step.title} content goes here.
								</div>
							</StepperPanel>
						))}
					</StepperPanels>
				</Stepper>
			</Example>

			<Example
				title="Read-only"
				code={code`
					<Stepper value={1}>
						<StepperStep value={0}>
							<StepperTitle>Account</StepperTitle>
						</StepperStep>
						<StepperSeparator />
						<StepperStep value={1}>
							<StepperTitle>Profile</StepperTitle>
						</StepperStep>
						<StepperSeparator />
						<StepperStep value={2}>
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
								<StepperTitle>{step.title}</StepperTitle>
							</StepperStep>
						</Fragment>
					))}
				</Stepper>
			</Example>
		</div>
	)
}
