'use client'

import { Field, Label } from '../../components/fieldset'
import { PasswordInput } from '../../components/input'
import { PasswordConfirm, PasswordConfirmInput } from '../../components/password-confirm'
import { Example } from '../components/example'

export const meta = { category: 'Forms' }

export default function PasswordConfirmDemo() {
	return (
		<div className="space-y-8">
			<Example title="Default">
				<PasswordConfirm
					className="space-y-4 lg:max-w-sm"
					warning="Passwords do not match"
					valid="Passwords match"
				>
					<Field>
						<Label>Password</Label>
						<PasswordInput placeholder="Enter password" />
					</Field>
					<Field>
						<Label>Confirm password</Label>
						<PasswordConfirmInput placeholder="Confirm password" />
					</Field>
				</PasswordConfirm>
			</Example>

			<Example title="Events">
				<PasswordConfirm
					className="space-y-4 lg:max-w-sm"
					warning="Passwords do not match"
					valid="Passwords match"
					onPasswordMatch={() => console.log('Passwords match')}
					onPasswordMismatch={() => console.log('Passwords do not match')}
				>
					<Field>
						<Label>Password</Label>
						<PasswordInput placeholder="Enter password" />
					</Field>
					<Field>
						<Label>Confirm password</Label>
						<PasswordConfirmInput placeholder="Confirm password" />
					</Field>
				</PasswordConfirm>
			</Example>
		</div>
	)
}
