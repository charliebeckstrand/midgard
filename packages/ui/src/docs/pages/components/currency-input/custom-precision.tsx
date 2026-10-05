import { CurrencyInput } from 'ui/currency-input'
import { Field, Label } from 'ui/fieldset'

export default function CustomPrecision() {
	return (
		<Field>
			<Label>Rate per mile</Label>
			<CurrencyInput currency="USD" locale="en-US" precision={4} defaultValue={2.4567} />
		</Field>
	)
}
