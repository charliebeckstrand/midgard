import { CurrencyInput, type CurrencyInputProps } from 'ui/currency-input'

export default function CurrencyInputPlayground(props: CurrencyInputProps) {
	return <CurrencyInput aria-label="Amount" currency="USD" defaultValue={1234.56} {...props} />
}
