import { CreditCardInput } from 'ui/credit-card-input'
import { Field, Label } from 'ui/fieldset'

export default function BrandDetection() {
	return (
		<>
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
		</>
	)
}
