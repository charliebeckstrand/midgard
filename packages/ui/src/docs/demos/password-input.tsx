import { Example } from 'docs'
import { Lock } from 'lucide-react'
import { Field, Label } from '../../components/fieldset'
import { Icon } from '../../components/icon'
import { PasswordInput } from '../../components/password-input'

export function Demo() {
	return (
		<>
			<Example title="Variants">
				<Field>
					<Label htmlFor="password-default">Default</Label>
					<PasswordInput id="password-default" placeholder="Enter password" />
				</Field>
				<Field>
					<Label htmlFor="password-outline">Outline</Label>
					<PasswordInput id="password-outline" variant="outline" placeholder="Enter password" />
				</Field>
			</Example>

			<Example title="Prefix">
				<Field>
					<Label htmlFor="password-prefix">Password</Label>
					<PasswordInput
						id="password-prefix"
						prefix={<Icon icon={<Lock />} />}
						placeholder="Enter password"
					/>
				</Field>
			</Example>

			<Example title="Disabled">
				<Field>
					<Label htmlFor="password-disabled">Disabled</Label>
					<PasswordInput id="password-disabled" disabled placeholder="Disabled" />
				</Field>
			</Example>

			<Example title="Read-only">
				<Field>
					<Label>Readonly</Label>
					<PasswordInput readOnly defaultValue="hunter2" />
				</Field>
			</Example>

			<Example title="Invalid">
				<Field>
					<Label>Invalid</Label>
					<PasswordInput data-invalid placeholder="Enter password" />
				</Field>
			</Example>

			<Example title="Valid">
				<Field>
					<Label>Valid</Label>
					<PasswordInput data-valid placeholder="Enter password" />
				</Field>
			</Example>

			<Example title="Warning">
				<Field>
					<Label>Warning</Label>
					<PasswordInput data-warning placeholder="Enter password" />
				</Field>
			</Example>
		</>
	)
}
