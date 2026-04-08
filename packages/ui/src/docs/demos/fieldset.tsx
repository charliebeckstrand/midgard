import { Description, Field, Fieldset, Label, Legend } from '../../components/fieldset'
import { Input } from '../../components/input'
import { Select, SelectLabel, SelectOption } from '../../components/select'
import { Textarea } from '../../components/textarea'
import { code } from '../code'
import { Example } from '../example'

export const meta = { category: 'Forms' }

export default function FieldsetDemo() {
	return (
		<Example
			code={code`
				import { Description, Field, Fieldset, Label, Legend } from 'ui/fieldset'
				import { Input } from 'ui/input'
				import { Select, SelectLabel, SelectOption } from 'ui/select'
				import { Textarea } from 'ui/textarea'

				<Fieldset>
					<Legend>Profile</Legend>
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
						<Select placeholder="Select a country" displayValue={(v) => v}>
							<SelectOption value="United States">
								<SelectLabel>United States</SelectLabel>
							</SelectOption>
							<SelectOption value="Canada">
								<SelectLabel>Canada</SelectLabel>
							</SelectOption>
							<SelectOption value="United Kingdom">
								<SelectLabel>United Kingdom</SelectLabel>
							</SelectOption>
						</Select>
					</Field>
					<Field>
						<Label>Bio</Label>
						<Textarea placeholder="Tell us about yourself" />
					</Field>
				</Fieldset>
			`}
		>
			<Fieldset className="lg:max-w-lg">
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
						<Label>Country</Label>
						<Select placeholder="Select a country" displayValue={(v: string) => v}>
							<SelectOption value="United States">
								<SelectLabel>United States</SelectLabel>
							</SelectOption>
							<SelectOption value="Canada">
								<SelectLabel>Canada</SelectLabel>
							</SelectOption>
							<SelectOption value="United Kingdom">
								<SelectLabel>United Kingdom</SelectLabel>
							</SelectOption>
						</Select>
					</Field>
					<Field>
						<Label htmlFor="fieldset-bio">Bio</Label>
						<Textarea id="fieldset-bio" placeholder="Tell us about yourself" />
					</Field>
				</div>
			</Fieldset>
		</Example>
	)
}
