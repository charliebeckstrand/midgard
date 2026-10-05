import { CurrencyInput, type CurrencyInputProps } from 'ui/currency-input'

export default function CurrencyInputPlayground(props: CurrencyInputProps) {
	return (
		<CurrencyInput
			aria-label="Amount"
			currency="USD"
			locale="en-US"
			defaultValue={1234.56}
			{...props}
		/>
	)
}
