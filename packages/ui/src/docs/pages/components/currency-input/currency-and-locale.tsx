import { CurrencyInput } from 'ui/currency-input'
import { Field, Label } from 'ui/fieldset'

export default function CurrencyAndLocale() {
	return (
		<Field>
			<Label>Invoice total</Label>
			<CurrencyInput currency="EUR" locale="de-DE" defaultValue={2499} />
		</Field>
	)
}
