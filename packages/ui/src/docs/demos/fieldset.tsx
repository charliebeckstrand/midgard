import { Description, Field, Fieldset, Label, Legend } from '../../components/fieldset'
import { Input } from '../../components/input'
import { Select } from '../../components/select'
import { Textarea } from '../../components/textarea'

export const meta = { category: 'Forms' }

export default function FieldsetDemo() {
	return (
		<Fieldset className="max-w-lg">
			<Legend>Profile</Legend>
			<div className="space-y-6">
				<Field>
					<Label htmlFor="fieldset-name">Full name</Label>
					<Input id="fieldset-name" placeholder="Jane Smith" />
				</Field>
				<Field>
					<Label htmlFor="fieldset-email">Email</Label>
					<Description>We'll use this for account notifications.</Description>
					<Input id="fieldset-email" type="email" placeholder="jane@example.com" />
				</Field>
				<Field>
					<Label htmlFor="fieldset-country">Country</Label>
					<Select id="fieldset-country">
						<option>United States</option>
						<option>Canada</option>
						<option>United Kingdom</option>
					</Select>
				</Field>
				<Field>
					<Label htmlFor="fieldset-bio">Bio</Label>
					<Textarea id="fieldset-bio" placeholder="Tell us about yourself…" />
				</Field>
			</div>
		</Fieldset>
	)
}
