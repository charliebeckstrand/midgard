import { Checkbox, CheckboxField, CheckboxGroup } from '../../../components/checkbox'
import { Description, Label } from '../../../components/fieldset'
import { Axes, Example } from '../../engine'

export function Demo() {
	return (
		<>
			<Axes
				of="Checkbox"
				captions={false}
				render={(props, label) => (
					<CheckboxField>
						<Checkbox {...props} defaultChecked />
						<Label>{label}</Label>
					</CheckboxField>
				)}
			/>

			<Example title="Default">
				<CheckboxField>
					<Checkbox />
					<Label>Accept terms and conditions</Label>
					<Description>You agree to our Terms of Service and Privacy Policy.</Description>
				</CheckboxField>
			</Example>

			<Example title="Group">
				<CheckboxGroup aria-label="Notifications">
					<CheckboxField>
						<Checkbox />
						<Label>Subscribe to newsletter</Label>
						<Description>Get the latest news and updates.</Description>
					</CheckboxField>

					<CheckboxField>
						<Checkbox />
						<Label>Opt out of data collection</Label>
						<Description>We will not collect any personal data.</Description>
					</CheckboxField>
				</CheckboxGroup>
			</Example>

			<Example title="Disabled">
				<CheckboxGroup aria-label="Options">
					<CheckboxField>
						<Checkbox disabled />
						<Label>Disabled option</Label>
						<Description>This checkbox is disabled and cannot be interacted with.</Description>
					</CheckboxField>
				</CheckboxGroup>
			</Example>
		</>
	)
}
