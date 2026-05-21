import { Description, Field, Fieldset, Label, Legend, Message } from '../../components/fieldset'
import { Input } from '../../components/input'
import { Select, SelectLabel, SelectOption } from '../../components/select'
import { Stack } from '../../components/stack'
import { Textarea } from '../../components/textarea'
import { Example } from '../components/example'

export const meta = { category: 'Forms' }

export function Demo() {
	return (
		<Stack gap="xl">
			<Example title="Default">
				<Fieldset>
					<Legend>Profile</Legend>
					<Stack gap="lg">
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
			</Example>

			<Example title="Message">
				<Stack gap="lg">
					<Field>
						<Label htmlFor="message-error">Email</Label>
						<Input id="message-error" defaultValue="not-an-email" />
						<Message variant="error">Enter a valid email address.</Message>
					</Field>
					<Field>
						<Label htmlFor="message-success">Username</Label>
						<Input id="message-success" defaultValue="jane" />
						<Message variant="success">Username is available.</Message>
					</Field>
				</Stack>
			</Example>
		</Stack>
	)
}
