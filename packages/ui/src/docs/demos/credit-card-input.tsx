'use client'

import { useState } from 'react'
import {
	type CreditCardBrand,
	CreditCardCvvInput,
	CreditCardExpiryInput,
	CreditCardInput,
} from '../../components/credit-card-input'
import { Field, Label } from '../../components/fieldset'
import { Sizer } from '../../components/sizer'
import { Stack } from '../../components/stack'
import { Example } from '../components/example'

export const meta = { category: 'Inputs' }

function Controlled() {
	const [value, setValue] = useState('')

	return (
		<Example title="Controlled">
			<Sizer>
				<Field>
					<Label>Card number</Label>
					<CreditCardInput value={value} onChange={setValue} />
				</Field>
			</Sizer>
		</Example>
	)
}

function Composed() {
	const [brand, setBrand] = useState<CreditCardBrand | undefined>(undefined)

	return (
		<Example title="Composed (number + expiry + CVV)">
			<Sizer>
				<Stack gap={3}>
					<Field>
						<Label>Card number</Label>
						<CreditCardInput onBrandChange={setBrand} />
					</Field>
					<Field>
						<Label>Expiry</Label>
						<CreditCardExpiryInput />
					</Field>
					<Field>
						<Label>CVV</Label>
						<CreditCardCvvInput brand={brand} />
					</Field>
				</Stack>
			</Sizer>
		</Example>
	)
}

export default function CreditCardInputDemo() {
	return (
		<Stack gap={6}>
			<Example title="Default">
				<Sizer>
					<Field>
						<Label>Card number</Label>
						<CreditCardInput placeholder="1234 1234 1234 1234" />
					</Field>
				</Sizer>
			</Example>

			<Example title="Brand detection">
				<Sizer>
					<Stack gap={3}>
						<Field>
							<Label>Visa</Label>
							<CreditCardInput defaultValue="4242424242424242" />
						</Field>
						<Field>
							<Label>Amex</Label>
							<CreditCardInput defaultValue="378282246310005" />
						</Field>
						<Field>
							<Label>Mastercard</Label>
							<CreditCardInput defaultValue="5555555555554444" />
						</Field>
					</Stack>
				</Sizer>
			</Example>

			<Composed />

			<Controlled />

			<Example title="Sizes">
				<Sizer size="sm">
					<Field>
						<Label>Small</Label>
						<CreditCardInput size="sm" />
					</Field>
				</Sizer>
				<Sizer size="md">
					<Field>
						<Label>Medium</Label>
						<CreditCardInput size="md" />
					</Field>
				</Sizer>
				<Sizer size="lg">
					<Field>
						<Label>Large</Label>
						<CreditCardInput size="lg" />
					</Field>
				</Sizer>
			</Example>

			<Example title="Disabled">
				<Sizer>
					<Field>
						<Label>Disabled</Label>
						<CreditCardInput disabled defaultValue="4242424242424242" />
					</Field>
				</Sizer>
			</Example>

			<Example title="Invalid">
				<Sizer>
					<Field>
						<Label>Invalid</Label>
						<CreditCardInput data-invalid />
					</Field>
				</Sizer>
			</Example>
		</Stack>
	)
}
