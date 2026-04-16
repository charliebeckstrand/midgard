import { Checkbox, CheckboxField, CheckboxGroup } from '../../components/checkbox'
import { Description, Label } from '../../components/fieldset'
import { Stack } from '../../components/stack'
import { Example } from '../components/example'

export const meta = { category: 'Forms' }

const colors = ['blue', 'green', 'red'] as const

export default function CheckboxDemo() {
	return (
		<Stack gap={6}>
			<Example title="Default">
				<CheckboxGroup>
					<CheckboxField>
						<Checkbox id="checkbox-terms" />
						<Label htmlFor="checkbox-terms">Accept terms and conditions</Label>
						<Description>You agree to our Terms of Service and Privacy Policy.</Description>
					</CheckboxField>
				</CheckboxGroup>
			</Example>

			<Example title="Group">
				<CheckboxGroup>
					<CheckboxField>
						<Checkbox id="checkbox-newsletter" />
						<Label htmlFor="checkbox-newsletter">Subscribe to newsletter</Label>
						<Description>Get the latest news and updates.</Description>
					</CheckboxField>

					<CheckboxField>
						<Checkbox id="opt-out" />
						<Label htmlFor="opt-out">Opt out of data collection</Label>
						<Description>We will not collect any personal data.</Description>
					</CheckboxField>
				</CheckboxGroup>
			</Example>

			<Example title="Colors">
				<CheckboxGroup>
					{colors.map((color) => (
						<CheckboxField key={color}>
							<Checkbox id={`checkbox-${color}`} value={color} color={color} defaultChecked />
							<Label htmlFor={`checkbox-${color}`}>{color}</Label>
						</CheckboxField>
					))}
				</CheckboxGroup>
			</Example>

			<Example title="Disabled">
				<CheckboxGroup>
					<CheckboxField>
						<Checkbox id="checkbox-disabled" disabled />
						<Label htmlFor="checkbox-disabled">Disabled option</Label>
					</CheckboxField>
				</CheckboxGroup>
			</Example>
		</Stack>
	)
}
