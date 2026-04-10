'use client'

import { Minus, Plus } from 'lucide-react'
import { Fragment, useState } from 'react'
import { Button } from '../../components/button'
import { Icon } from '../../components/icon'
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
	{
		title: 'Confirm',
		description:
			'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. ',
	},
]

export default function StepperDemo() {
	const [horizontalValue, setHorizontalValue] = useState(1)
	const [verticalValue, setVerticalValue] = useState(1)

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
				title="Vertical with descriptions"
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
