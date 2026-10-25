import { useState } from 'react'
import { Button } from 'ui/button'
import { Flex } from 'ui/flex'
import { Tab, TabContent, TabContents, TabList, Tabs } from 'ui/tabs'
import { Text } from 'ui/text'

const steps = [
	{ id: 'shipping', label: 'Shipping', description: 'Enter your shipping address.' },
	{ id: 'payment', label: 'Payment', description: 'Enter your card details.' },
	{ id: 'review', label: 'Review', description: 'Check your order before you pay.' },
]

const ids = steps.map((step) => step.id)

export default function Controlled() {
	const [step, setStep] = useState('shipping')

	const index = ids.indexOf(step)

	return (
		<Tabs value={step} onValueChange={(value) => setStep(value ?? 'shipping')}>
			<TabList aria-label="Checkout">
				{steps.map(({ id, label }) => (
					<Tab key={id} value={id}>
						{label}
					</Tab>
				))}
			</TabList>
			<TabContents>
				{steps.map(({ id, description }) => (
					<TabContent key={id} value={id}>
						<Text tone="muted">{description}</Text>
					</TabContent>
				))}
			</TabContents>
			<Flex gap="sm">
				<Button
					variant="outline"
					disabled={index === 0}
					onClick={() => setStep(ids[index - 1] ?? step)}
				>
					Back
				</Button>
				<Button
					disabled={index === steps.length - 1}
					onClick={() => setStep(ids[index + 1] ?? step)}
				>
					Next
				</Button>
			</Flex>
		</Tabs>
	)
}
