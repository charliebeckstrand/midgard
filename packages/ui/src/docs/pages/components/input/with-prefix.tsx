import { Hash } from 'lucide-react'
import { Icon } from 'ui/icon'
import { Input } from 'ui/input'

export default function WithPrefix() {
	return (
		<Input prefix={<Icon icon={<Hash />} />} aria-label="Channel name" placeholder="design-team" />
	)
}
