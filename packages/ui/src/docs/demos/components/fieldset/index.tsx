import { Description, Field, Fieldset, Label, Legend } from '../../../../components/fieldset'
import { Input } from '../../../../components/input'
import { Select, SelectLabel, SelectOption } from '../../../../components/select'
import { Stack } from '../../../../components/stack'
import { Textarea } from '../../../../components/textarea'
import { Example } from '../../../engine'

export function Demo() {
	return (
		<Stack gap="xl">
			<Example title="Grouping controls">
				<Fieldset>
					<Legend>Profile</Legend>
					<Stack gap="lg">
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
							<Label>Bio</Label>
							<Textarea placeholder="Tell us about yourself" />
						</Field>
					</Stack>
				</Fieldset>
			</Example>
		</Stack>
	)
}
