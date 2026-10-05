import { Users } from 'lucide-react'
import { Icon } from 'ui/icon'
import { NumberInput } from 'ui/number-input'

export default function WithPrefix() {
	return (
		<NumberInput
			prefix={<Icon icon={<Users />} />}
			aria-label="Guests"
			min={1}
			max={12}
			defaultValue={2}
		/>
	)
}
