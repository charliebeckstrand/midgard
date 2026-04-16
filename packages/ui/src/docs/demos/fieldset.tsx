import { Description, Field, Fieldset, Label, Legend } from '../../components/fieldset'
import { Input } from '../../components/input'
import { Select, SelectLabel, SelectOption } from '../../components/select'
import { Sizer } from '../../components/sizer'
import { Stack } from '../../components/stack'
import { Textarea } from '../../components/textarea'
import { Example } from '../components/example'

export const meta = { category: 'Forms' }

export default function FieldsetDemo() {
	return (
		<Example title="Default">
			<Sizer size="lg">
				<Fieldset>
					<Legend>Profile</Legend>
					<Stack gap={4}>
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
					</Stack>
				</Fieldset>
			</Sizer>
		</Example>
	)
}
