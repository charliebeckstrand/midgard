import { NumberInput, type NumberInputProps } from 'ui/number-input'

export default function NumberInputPlayground(props: NumberInputProps) {
	return <NumberInput aria-label="Quantity" defaultValue={1} min={0} {...props} />
}
