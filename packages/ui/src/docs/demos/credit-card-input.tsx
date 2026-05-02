'use client'

import { useState } from 'react'
import {
	type CreditCardBrand,
	CreditCardCvvInput,
	CreditCardExpiryInput,
	CreditCardInput,
} from '../../components/credit-card-input'
import { Field, Label } from '../../components/fieldset'
import { Flex } from '../../components/flex'
import { Stack } from '../../components/stack'
import { code } from '../code'
import { Example } from '../components/example'

export const meta = { category: 'Input' }

function Controlled() {
	const [value, setValue] = useState('')

	return (
		<Example
			title="Controlled"
			code={code`
				import { useState } from 'react'
				import { Field, Label } from 'ui/fieldset'
				import { CreditCardInput } from 'ui/credit-card-input'

				const [value, setValue] = useState('')
				
				<Field>
					<Label>Card number</Label>
					<CreditCardInput value={value} onChange={setValue} />
				</Field>
			`}
		>
			<Field>
				<Label>Card number</Label>
				<CreditCardInput value={value} onChange={setValue} />
			</Field>
		</Example>
	)
}

function Composed() {
	const [brand, setBrand] = useState<CreditCardBrand | undefined>(undefined)

	return (
		<Example title="Composed">
			<Stack gap="md">
				<Field>
					<Label>Card number</Label>
					<CreditCardInput onBrandChange={setBrand} />
				</Field>
				<Flex
					gap="sm"
					direction={{
						initial: 'row',
						sm: 'col',
					}}
				>
					<Field className="w-full">
						<Label>Expiry</Label>
						<CreditCardExpiryInput />
					</Field>
					<Field className="w-full">
						<Label>CVV</Label>
						<CreditCardCvvInput brand={brand} />
					</Field>
				</Flex>
			</Stack>
		</Example>
	)
}

export default function CreditCardInputDemo() {
	return (
		<Stack gap="xl">
			<Example title="Default">
				<Field>
					<Label>Card number</Label>
					<CreditCardInput />
				</Field>
			</Example>

			<Example title="Brand detection">
				<Stack gap="md">
					<Field>
						<Label>Visa</Label>
						<CreditCardInput defaultValue="4242424242424242" readOnly />
					</Field>
					<Field>
						<Label>Amex</Label>
						<CreditCardInput defaultValue="378282246310005" readOnly />
					</Field>
					<Field>
						<Label>Mastercard</Label>
						<CreditCardInput defaultValue="5555555555554444" readOnly />
					</Field>
				</Stack>
			</Example>

			<Composed />

			<Controlled />

			<Example title="Sizes">
				<Field>
					<Label>Small</Label>
					<CreditCardInput size="sm" />
				</Field>
				<Field>
					<Label>Medium</Label>
					<CreditCardInput size="md" />
				</Field>
				<Field>
					<Label>Large</Label>
					<CreditCardInput size="lg" />
				</Field>
			</Example>

			<Example title="Disabled">
				<Field>
					<Label>Disabled</Label>
					<CreditCardInput disabled defaultValue="4242424242424242" />
				</Field>
			</Example>

			<Example title="Invalid">
				<Field>
					<Label>Invalid</Label>
					<CreditCardInput data-invalid />
				</Field>
			</Example>
		</Stack>
	)
}
