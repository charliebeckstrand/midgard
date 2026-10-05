import { useState } from 'react'
import {
	type CreditCardBrand,
	CreditCardInput,
	CreditCardInputCvv,
	CreditCardInputExpiry,
} from 'ui/credit-card-input'
import { Field, Label } from 'ui/fieldset'
import { Split } from 'ui/split'

export default function CardDetails() {
	const [brand, setBrand] = useState<CreditCardBrand>()

	return (
		<>
			<Field>
				<Label>Card number</Label>
				<CreditCardInput onBrandChange={setBrand} />
			</Field>
			<Split gap="md">
				<Field>
					<Label>Expiration date</Label>
					<CreditCardInputExpiry />
				</Field>
				<Field>
					<Label>Security code</Label>
					<CreditCardInputCvv brand={brand} />
				</Field>
			</Split>
		</>
	)
}
