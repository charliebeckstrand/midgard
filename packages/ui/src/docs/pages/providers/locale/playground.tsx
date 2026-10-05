import { CurrencyInput } from 'ui/currency-input'
import { Field, Label } from 'ui/fieldset'
import { LocaleProvider, type LocaleProviderProps } from 'ui/providers/locale'

export default function LocalePlayground(props: LocaleProviderProps) {
	return (
		<LocaleProvider locale="en-US" currency="USD" {...props}>
			<Field>
				<Label>Invoice total</Label>
				<CurrencyInput defaultValue={1234.56} />
			</Field>
		</LocaleProvider>
	)
}
