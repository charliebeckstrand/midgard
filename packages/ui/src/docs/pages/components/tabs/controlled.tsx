import { useRef, useState } from 'react'
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

	const backRef = useRef<HTMLButtonElement>(null)

	const nextRef = useRef<HTMLButtonElement>(null)

	// A press onto the first or the last tab disables its button, so it gives the
	// focus to the other button first.
	const back = () => {
		if (index === 1) nextRef.current?.focus()

		setStep(ids[index - 1] ?? step)
	}

	const next = () => {
		if (index === steps.length - 2) backRef.current?.focus()

		setStep(ids[index + 1] ?? step)
	}

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
				<Button ref={backRef} variant="outline" disabled={index === 0} onClick={back}>
					Back
				</Button>
				<Button ref={nextRef} disabled={index === steps.length - 1} onClick={next}>
					Next
				</Button>
			</Flex>
		</Tabs>
	)
}
