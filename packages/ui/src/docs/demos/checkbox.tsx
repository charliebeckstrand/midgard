import { Checkbox, CheckboxField, CheckboxGroup } from '../../components/checkbox'
import { Description, Label } from '../../components/fieldset'
import { Example } from '../example'

export const meta = { category: 'Forms' }

const colors = ['blue', 'green', 'red'] as const

export default function CheckboxDemo() {
	return (
		<div className="space-y-8">
			<Example
				title="Default"
				code={`
import { Checkbox, CheckboxField, CheckboxGroup } from 'ui/checkbox'
import { Description, Label } from 'ui/fieldset'

<CheckboxGroup>
	<CheckboxField>
		<Checkbox id="terms" />
		<Label htmlFor="terms">Accept terms</Label>
		<Description>You agree to our Terms of Service.</Description>
	</CheckboxField>
</CheckboxGroup>
`}
			>
				<CheckboxGroup>
					<CheckboxField>
						<Checkbox id="checkbox-terms" />
						<Label htmlFor="checkbox-terms">Accept terms and conditions</Label>
						<Description>You agree to our Terms of Service and Privacy Policy.</Description>
					</CheckboxField>
					<CheckboxField>
						<Checkbox id="checkbox-disabled" disabled />
						<Label htmlFor="checkbox-disabled">Disabled option</Label>
					</CheckboxField>
				</CheckboxGroup>
			</Example>
			<Example
				title="Colors"
				code={`import { Checkbox } from 'ui/checkbox'\n\n${colors.map((c) => `<Checkbox color="${c}" />`).join('\n')}`}
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
				code={`
import { Checkbox } from 'ui/checkbox'

<CheckboxField>
	<Checkbox id="checkbox-disabled" disabled />
	<Label htmlFor="checkbox-disabled">Disabled option</Label>
</CheckboxField>`}
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
