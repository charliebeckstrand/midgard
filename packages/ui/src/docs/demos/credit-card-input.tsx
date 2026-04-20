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
import { Sizer } from '../../components/sizer'
import { Stack } from '../../components/stack'
import { Example } from '../components/example'

export const meta = { category: 'Input' }

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
		<Example title="Composed">
			<Sizer>
				<Stack gap={3}>
					<Field>
						<Label>Card number</Label>
						<CreditCardInput onBrandChange={setBrand} />
					</Field>
					<Flex
						gap={2}
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
						<CreditCardInput />
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
