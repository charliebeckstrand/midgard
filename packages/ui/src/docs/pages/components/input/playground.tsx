import { Input, type InputProps } from 'ui/input'

export default function InputPlayground(props: InputProps) {
	return <Input aria-label="Email" placeholder="wade@example.com" {...props} />
}
