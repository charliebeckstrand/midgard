import { useId } from 'react'
import { Checkbox, CheckboxField, CheckboxGroup } from '../../components/checkbox'
import { Description, Label } from '../../components/fieldset'
import { Example } from '../components/example'

export const meta = { category: 'Forms' }

const colors = ['blue', 'green', 'red'] as const

export function Demo() {
	const termsId = useId()
	const newsletterId = useId()
	const optOutId = useId()
	const disabledId = useId()
	const colorIds = useId()

	return (
		<>
			<Example title="Default">
				<CheckboxGroup>
					<CheckboxField>
						<Checkbox id={termsId} />
						<Label htmlFor={termsId}>Accept terms and conditions</Label>
						<Description>You agree to our Terms of Service and Privacy Policy.</Description>
					</CheckboxField>
				</CheckboxGroup>
			</Example>

			<Example title="Group">
				<CheckboxGroup>
					<CheckboxField>
						<Checkbox id={newsletterId} />
						<Label htmlFor={newsletterId}>Subscribe to newsletter</Label>
						<Description>Get the latest news and updates.</Description>
					</CheckboxField>

					<CheckboxField>
						<Checkbox id={optOutId} />
						<Label htmlFor={optOutId}>Opt out of data collection</Label>
						<Description>We will not collect any personal data.</Description>
					</CheckboxField>
				</CheckboxGroup>
			</Example>

			<Example title="Colors">
				<CheckboxGroup>
					{colors.map((color) => (
						<CheckboxField key={color}>
							<Checkbox id={`${colorIds}-${color}`} value={color} color={color} defaultChecked />
							<Label htmlFor={`${colorIds}-${color}`}>{color}</Label>
						</CheckboxField>
					))}
				</CheckboxGroup>
			</Example>

			<Example title="Disabled">
				<CheckboxGroup>
					<CheckboxField>
						<Checkbox id={disabledId} disabled />
						<Label htmlFor={disabledId}>Disabled option</Label>
						<Description>This checkbox is disabled and cannot be interacted with.</Description>
					</CheckboxField>
				</CheckboxGroup>
			</Example>
		</>
	)
}
