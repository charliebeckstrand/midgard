import { CurrencyInput } from 'ui/currency-input'
import { Field, Label } from 'ui/fieldset'

export default function Disabled() {
	return (
		<Field>
			<Label>Amount</Label>
			<CurrencyInput currency="USD" defaultValue={500} disabled />
		</Field>
	)
}
