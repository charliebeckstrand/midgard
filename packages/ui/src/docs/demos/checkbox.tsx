import { Checkbox, CheckboxField, CheckboxGroup } from '../../components/checkbox'
import { Description, Label } from '../../components/fieldset'
import { code } from '../code'
import { Example } from '../example'

export const meta = { category: 'Forms' }

const colors = ['blue', 'green', 'red'] as const

export default function CheckboxDemo() {
	return (
		<div className="space-y-8">
			<Example
				title="Default"
				code={code`
					import { Checkbox, CheckboxField } from 'ui/checkbox'
					import { Description, Label } from 'ui/fieldset'

					<CheckboxField>
						<Checkbox id="terms" />
						<Label htmlFor="terms">Accept terms</Label>
						<Description>You agree to our Terms of Service.</Description>
					</CheckboxField>
				`}
			>
				<CheckboxGroup>
					<CheckboxField>
						<Checkbox id="checkbox-terms" />
						<Label htmlFor="checkbox-terms">Accept terms and conditions</Label>
						<Description>You agree to our Terms of Service and Privacy Policy.</Description>
					</CheckboxField>
				</CheckboxGroup>
			</Example>

			<Example
				title="Group"
				code={code`
					import { Checkbox, CheckboxField, CheckboxGroup } from 'ui/checkbox'
					import { Description, Label } from 'ui/fieldset'

					<CheckboxGroup>
						<CheckboxField>
							<Checkbox id="newsletter" />
							<Label htmlFor="newsletter">Subscribe to newsletter</Label>
							<Description>Get the latest news and updates.</Description>
						</CheckboxField>

						<CheckboxField>
							<Checkbox id="opt-out" />
							<Label htmlFor="opt-out">Opt out of data collection</Label>
							<Description>We will not collect any personal data.</Description>
						</CheckboxField>
					</CheckboxGroup>
				`}
			>
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

			<Example
				title="Colors"
				code={code`
					import { Checkbox, CheckboxField, CheckboxGroup } from 'ui/checkbox'
					import { Description, Label } from 'ui/fieldset'

					<CheckboxGroup>
						${colors.map(
							(c) => `<CheckboxField>
		<Checkbox color="${c}" defaultChecked />
		<Label>${c}</Label>
	</CheckboxField>`,
						)}
					</CheckboxGroup>
				`}
			>
				<CheckboxGroup>
					{colors.map((color) => (
						<CheckboxField key={color}>
							<Checkbox id={`checkbox-${color}`} value={color} color={color} defaultChecked />
							<Label htmlFor={`checkbox-${color}`}>{color}</Label>
						</CheckboxField>
					))}
				</CheckboxGroup>
			</Example>

			<Example
				title="Disabled"
				code={code`
					import { Checkbox, CheckboxField } from 'ui/checkbox'
					import { Description, Label } from 'ui/fieldset'

					<CheckboxField>
						<Checkbox id="checkbox-disabled" disabled />
						<Label htmlFor="checkbox-disabled">Disabled option</Label>
					</CheckboxField>
				`}
			>
				<CheckboxGroup>
					<CheckboxField>
						<Checkbox id="checkbox-disabled" disabled />
						<Label htmlFor="checkbox-disabled">Disabled option</Label>
					</CheckboxField>
				</CheckboxGroup>
			</Example>
		</div>
	)
}
