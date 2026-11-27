import { CurrencyInput } from 'ui/currency-input'
import { Field, Label } from 'ui/fieldset'

export default function CurrencyAndLocale() {
	return (
		<Field>
			<Label>Invoice total</Label>
			<div lang="de-DE">
				<CurrencyInput currency="EUR" locale="de-DE" defaultValue={2499} />
			</div>
		</Field>
	)
}
