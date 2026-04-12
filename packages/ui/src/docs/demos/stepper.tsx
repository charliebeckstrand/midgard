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
import { Example } from '../components/example'
import { ValueStepper } from '../components/value-stepper'

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
					When <code>orientation</code> isn't explicitly set, the stepper falls back to{' '}
					<code>vertical</code> on mobile.
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

			<Example title="Read-only">
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
