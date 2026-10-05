import { CreditCardInput, type CreditCardInputProps } from 'ui/credit-card-input'

export default function CreditCardInputPlayground(props: CreditCardInputProps) {
	return <CreditCardInput aria-label="Card number" {...props} />
}
