import { CurrencyInput } from 'ui/currency-input'
import { Field, Label } from 'ui/fieldset'

export default function NoFractionDigits() {
	return (
		<Field>
			<Label>Price</Label>
			<CurrencyInput currency="JPY" locale="ja-JP" defaultValue={9800} />
		</Field>
	)
}
