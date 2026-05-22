'use client'

import { useState } from 'react'
import {
	type CreditCardBrand,
	CreditCardInput,
	CreditCardInputCvv,
	CreditCardInputExpiry,
} from '../../components/credit-card-input'
import { Field, Label } from '../../components/fieldset'
import { Flex } from '../../components/flex'
import { Stack } from '../../components/stack'
import { code } from '../code'
import { Example } from '../components/example'

export const meta = { category: 'Input' }

function ControlledExample() {
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
					<CreditCardInput value={value} onValueChange={setValue} />
				</Field>
			`}
		>
			<Field>
				<Label>Card number</Label>
				<CreditCardInput value={value} onValueChange={setValue} />
			</Field>
		</Example>
	)
}

function ComposedExample() {
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
						<CreditCardInputExpiry />
					</Field>
					<Field className="w-full">
						<Label>CVV</Label>
						<CreditCardInputCvv brand={brand} />
					</Field>
				</Flex>
			</Stack>
		</Example>
	)
}

export function Demo() {
	return (
		<>
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

			<ComposedExample />

			<ControlledExample />

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
		</>
	)
}
