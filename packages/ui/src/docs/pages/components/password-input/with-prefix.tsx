import { Lock } from 'lucide-react'
import { Field, Label } from 'ui/fieldset'
import { Icon } from 'ui/icon'
import { PasswordInput } from 'ui/password-input'

export default function WithPrefix() {
	return (
		<Field>
			<Label>Password</Label>
			<PasswordInput prefix={<Icon icon={<Lock />} />} placeholder="Enter password" />
		</Field>
	)
}
