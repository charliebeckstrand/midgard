import { Field, Label } from '../../../components/fieldset'
import {
	PasswordConfirm,
	PasswordConfirmNew,
	PasswordConfirmRepeat,
} from '../../../components/password-confirm'
import { Axes, Example } from '../../engine'

export default function Demo() {
	return (
		<>
			<Axes
				of="PasswordConfirmRepeat"
				captions={false}
				render={(props, label) => (
					<PasswordConfirm>
						<PasswordConfirmRepeat {...props} aria-label={label} placeholder={label} />
					</PasswordConfirm>
				)}
			/>

			<Example title="Mismatch warning">
				<PasswordConfirm warning="Passwords do not match">
					<Field>
						<Label>Password</Label>
						<PasswordConfirmNew placeholder="Enter password" />
					</Field>
					<Field>
						<Label>Confirm password</Label>
						<PasswordConfirmRepeat placeholder="Confirm password" />
					</Field>
				</PasswordConfirm>
			</Example>
		</>
	)
}
