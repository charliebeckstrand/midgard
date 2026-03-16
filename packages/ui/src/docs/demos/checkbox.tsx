import { useState } from 'react'
import { Checkbox, CheckboxField, CheckboxGroup } from '../../components/checkbox'
import { Description, Label } from '../../components/fieldset'

export const meta = { category: 'Forms' }

export default function CheckboxDemo() {
	const [checked, setChecked] = useState(false)

	return (
		<CheckboxGroup>
			<CheckboxField>
				<Checkbox checked={checked} onChange={setChecked} />
				<Label>Accept terms and conditions</Label>
				<Description>You agree to our Terms of Service and Privacy Policy.</Description>
			</CheckboxField>
			<CheckboxField>
				<Checkbox defaultChecked />
				<Label>Subscribe to newsletter</Label>
			</CheckboxField>
			<CheckboxField disabled>
				<Checkbox />
				<Label>Disabled option</Label>
			</CheckboxField>
		</CheckboxGroup>
	)
}
