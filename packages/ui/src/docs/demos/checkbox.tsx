import { Checkbox, CheckboxField, CheckboxGroup } from '../../components/checkbox'
import { Description, Label } from '../../components/fieldset'
import { Example } from '../components/example'

export const meta = { category: 'Forms' }

const colors = ['blue', 'green', 'red'] as const

export function Demo() {
	return (
		<>
			<Example title="Default">
				<CheckboxField>
					<Checkbox />
					<Label>Accept terms and conditions</Label>
					<Description>You agree to our Terms of Service and Privacy Policy.</Description>
				</CheckboxField>
			</Example>

			<Example title="Group">
				<CheckboxGroup>
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

			<Example title="Colors">
				<CheckboxGroup>
					{colors.map((color) => (
						<CheckboxField key={color}>
							<Checkbox value={color} color={color} defaultChecked />
							<Label>{color}</Label>
						</CheckboxField>
					))}
				</CheckboxGroup>
			</Example>

			<Example title="Disabled">
				<CheckboxGroup>
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
