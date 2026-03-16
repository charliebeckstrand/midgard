import { Description, Field, FieldGroup, Fieldset, Label, Legend } from '../../components/fieldset'
import { Input } from '../../components/input'
import { Select } from '../../components/select'
import { Textarea } from '../../components/textarea'

export const meta = { category: 'Forms' }

export default function FieldsetDemo() {
	return (
		<Fieldset className="max-w-lg">
			<Legend>Profile</Legend>
			<FieldGroup>
				<Field>
					<Label>Full name</Label>
					<Input placeholder="Jane Smith" />
				</Field>
				<Field>
					<Label>Email</Label>
					<Description>We'll use this for account notifications.</Description>
					<Input type="email" placeholder="jane@example.com" />
				</Field>
				<Field>
					<Label>Country</Label>
					<Select>
						<option>United States</option>
						<option>Canada</option>
						<option>United Kingdom</option>
					</Select>
				</Field>
				<Field>
					<Label>Bio</Label>
					<Textarea placeholder="Tell us about yourself…" />
				</Field>
			</FieldGroup>
		</Fieldset>
	)
}
