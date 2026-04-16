'use client'

import { Field, Label } from '../../components/fieldset'
import { PasswordConfirm, PasswordConfirmInput } from '../../components/password-confirm'
import { PasswordInput } from '../../components/password-input'
import { Sizer } from '../../components/sizer'
import { Stack } from '../../components/stack'
import { Example } from '../components/example'

export const meta = { category: 'Forms' }

export default function PasswordConfirmDemo() {
	return (
		<Stack gap={6}>
			<Example title="Default">
				<Sizer>
					<PasswordConfirm className="space-y-4" warning="Passwords do not match">
						<Field>
							<Label>Password</Label>
							<PasswordInput placeholder="Enter password" />
						</Field>
						<Field>
							<Label>Confirm password</Label>
							<PasswordConfirmInput placeholder="Confirm password" />
						</Field>
					</PasswordConfirm>
				</Sizer>
			</Example>

			<Example title="Events">
				<Sizer>
					<PasswordConfirm
						className="space-y-4"
						warning="Passwords do not match"
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
				</Sizer>
			</Example>
		</Stack>
	)
}
