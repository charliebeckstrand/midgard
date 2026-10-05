import { useState } from 'react'
import { Button } from 'ui/button'
import { Flex } from 'ui/flex'
import { Tab, TabContent, TabContents, TabList, Tabs } from 'ui/tabs'
import { Text } from 'ui/text'

const steps = ['Shipping', 'Payment', 'Review']

export default function Controlled() {
	const [step, setStep] = useState('Shipping')

	const index = steps.indexOf(step)

	return (
		<Tabs value={step} onValueChange={(value) => setStep(value ?? 'Shipping')}>
			<TabList aria-label="Checkout">
				{steps.map((name) => (
					<Tab key={name} value={name}>
						{name}
					</Tab>
				))}
			</TabList>
			<TabContents>
				{steps.map((name) => (
					<TabContent key={name} value={name}>
						<Text tone="muted">Enter the {name.toLowerCase()} details.</Text>
					</TabContent>
				))}
			</TabContents>
			<Flex gap="sm">
				<Button
					variant="outline"
					disabled={index === 0}
					onClick={() => setStep(steps[index - 1] ?? step)}
				>
					Back
				</Button>
				<Button
					disabled={index === steps.length - 1}
					onClick={() => setStep(steps[index + 1] ?? step)}
				>
					Next
				</Button>
			</Flex>
		</Tabs>
	)
}
