import { Lock } from 'lucide-react'
import { Field, Label } from '../../../components/fieldset'
import { Icon } from '../../../components/icon'
import { PasswordInput } from '../../../components/password-input'
import { Axes, Example } from '../../engine'

export const meta = { category: 'input' }

export function Demo() {
	return (
		<>
			<Axes
				of="PasswordInput"
				render={(props, label) => (
					<PasswordInput {...props} aria-label={label} placeholder={label} />
				)}
			/>

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
