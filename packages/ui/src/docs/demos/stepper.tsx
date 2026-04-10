'use client'

import { Minus, Plus } from 'lucide-react'
import { Fragment, useState } from 'react'
import { Alert, AlertDescription } from '../../components/alert'
import { Button } from '../../components/button'
import { Icon } from '../../components/icon'
import {
	Stepper,
	StepperDescription,
	StepperIndicator,
	StepperPanel,
	StepperPanels,
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
			<Example
				title="Horizontal"
				actions={
					<div className="flex items-center gap-1">
						<Button
							variant="plain"
							disabled={horizontalValue <= 0}
							onClick={() => setHorizontalValue((v) => Math.max(0, v - 1))}
						>
							<Icon icon={<Minus />} />
						</Button>
						<Button
							variant="plain"
							disabled={horizontalValue >= steps.length - 1}
							onClick={() => setHorizontalValue((v) => Math.min(steps.length - 1, v + 1))}
						>
							<Icon icon={<Plus />} />
						</Button>
					</div>
				}
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
				footer={
					<Alert type="info">
						<AlertDescription>
							When <code className="font-bold">orientation</code> isn't explicitly set, the stepper
							falls back to vertical on mobile.
						</AlertDescription>
					</Alert>
				}
			>
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
			</Example>

			<Example
				title="Vertical"
				actions={
					<div className="flex items-center gap-1">
						<Button
							variant="plain"
							disabled={verticalValue <= 0}
							onClick={() => setVerticalValue((v) => Math.max(0, v - 1))}
						>
							<Icon icon={<Minus />} />
						</Button>
						<Button
							variant="plain"
							disabled={verticalValue >= steps.length - 1}
							onClick={() => setVerticalValue((v) => Math.min(steps.length - 1, v + 1))}
						>
							<Icon icon={<Plus />} />
						</Button>
					</div>
				}
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
				title="Linear"
				actions={
					<div className="flex items-center gap-1">
						<Button
							variant="plain"
							disabled={linearValue <= 0}
							onClick={() => setLinearValue((v) => Math.max(0, v - 1))}
						>
							<Icon icon={<Minus />} />
						</Button>
						<Button
							variant="plain"
							disabled={linearValue >= steps.length - 1}
							onClick={() => setLinearValue((v) => Math.min(steps.length - 1, v + 1))}
						>
							<Icon icon={<Plus />} />
						</Button>
					</div>
				}
				code={code`
					// Upcoming steps render as <button disabled>; only the buttons
					// outside the stepper can advance the value.
					<Stepper linear value={value} onValueChange={setValue}>
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
				<Stepper linear value={linearValue} onValueChange={setLinearValue}>
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

			<Example
				title="With content panels"
				actions={
					<div className="flex items-center gap-1">
						<Button
							variant="plain"
							disabled={panelsValue <= 0}
							onClick={() => setPanelsValue((v) => Math.max(0, v - 1))}
						>
							<Icon icon={<Minus />} />
						</Button>
						<Button
							variant="plain"
							disabled={panelsValue >= steps.length - 1}
							onClick={() => setPanelsValue((v) => Math.min(steps.length - 1, v + 1))}
						>
							<Icon icon={<Plus />} />
						</Button>
					</div>
				}
				code={code`
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
								<StepperIndicator>{index + 1}</StepperIndicator>
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
