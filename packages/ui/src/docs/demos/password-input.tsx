import { Lock } from 'lucide-react'
import { Field, Label } from '../../components/fieldset'
import { Icon } from '../../components/icon'
import { PasswordInput } from '../../components/password-input'
import { Stack } from '../../components/stack'
import { Example } from '../components/example'

export const meta = { category: 'Password' }

export default function PasswordInputDemo() {
	return (
		<Stack gap="xl">
			<Example title="Variants">
				<Field>
					<Label htmlFor="password-default">Password</Label>
					<PasswordInput id="password-default" placeholder="Enter password" />
				</Field>
				<Field>
					<Label htmlFor="password-outline">Outline</Label>
					<PasswordInput id="password-outline" variant="outline" placeholder="Enter password" />
				</Field>
			</Example>

			<Example title="Sizes">
				<Field>
					<Label>Small</Label>
					<PasswordInput size="sm" placeholder="Small input" />
				</Field>
				<Field>
					<Label>Medium</Label>
					<PasswordInput size="md" placeholder="Medium input" />
				</Field>
				<Field>
					<Label>Large</Label>
					<PasswordInput size="lg" placeholder="Large input" />
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

			<Example title="Readonly">
				<Field>
					<Label>Readonly</Label>
					<PasswordInput readOnly defaultValue="hunter2" />
				</Field>
			</Example>

			<Example title="Invalid">
				<Field>
					<Label>Invalid</Label>
					<PasswordInput data-invalid placeholder="Invalid input" />
				</Field>
			</Example>

			<Example title="Valid">
				<Field>
					<Label>Valid</Label>
					<PasswordInput data-valid placeholder="Valid input" />
				</Field>
			</Example>
		</Stack>
	)
}
