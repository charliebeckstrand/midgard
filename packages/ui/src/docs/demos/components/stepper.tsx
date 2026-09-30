import { Fragment, useState } from 'react'
import { Alert } from '../../../components/alert'
import {
	Stepper,
	StepperPanel,
	StepperPanels,
	StepperSeparator,
	StepperStep,
	StepperTitle,
} from '../../../components/stepper'
import { Axes, Example, ValueStepper } from '../../engine'

const steps = [
	{ title: 'Account', description: 'Create your account' },
	{ title: 'Profile', description: 'Add your details' },
	{
		title: 'Confirm',
		description: 'Review your information and submit',
	},
]

export function Demo() {
	const [panelsValue, setPanelsValue] = useState(0)

	return (
		<>
			<Alert
				severity="info"
				closable
				description={
					<>
						When <code>orientation</code> is not explicitly set, the stepper defaults to{' '}
						<code>vertical</code> on mobile.
					</>
				}
			/>

			<Axes
				of="Stepper"
				omit={['mount']}
				render={(props) => (
					<Stepper {...props} defaultValue={1}>
						{steps.map((step, index) => (
							<Fragment key={step.title}>
								{index > 0 && <StepperSeparator />}
								<StepperStep value={index}>
									<StepperTitle>{step.title}</StepperTitle>
								</StepperStep>
							</Fragment>
						))}
					</Stepper>
				)}
			/>

			<Example
				title="With content panels"
				actions={
					<ValueStepper
						label="step"
						value={panelsValue}
						onValueChange={setPanelsValue}
						max={steps.length - 1}
					/>
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
		</>
	)
}
