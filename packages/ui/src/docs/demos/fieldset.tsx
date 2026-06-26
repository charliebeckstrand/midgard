import { Description, Field, Fieldset, Label, Legend, Message } from '../../components/fieldset'
import { Input } from '../../components/input'
import { PasswordInput } from '../../components/password-input'
import { Select, SelectLabel, SelectOption } from '../../components/select'
import { Stack } from '../../components/stack'
import { Tab, TabContent, TabContents, TabList, Tabs } from '../../components/tabs'
import { Textarea } from '../../components/textarea'
import { Example } from '../engine'

export function Demo() {
	return (
		<Tabs defaultValue="fieldset">
			<Stack gap="lg">
				<TabList aria-label="Fieldset primitives">
					<Tab value="fieldset">Fieldset</Tab>
					<Tab value="legend">Legend</Tab>
					<Tab value="field">Field</Tab>
					<Tab value="label">Label</Tab>
					<Tab value="description">Description</Tab>
					<Tab value="message">Message</Tab>
				</TabList>
				<TabContents>
					<TabContent value="fieldset">
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
					</TabContent>

					<TabContent value="legend">
						<Stack gap="xl">
							<Example title="Captioning a group">
								<Fieldset>
									<Legend>Shipping address</Legend>
									<Stack gap="lg">
										<Field>
											<Label>Street</Label>
											<Input placeholder="123 Main St" />
										</Field>
										<Field>
											<Label>City</Label>
											<Input placeholder="Springfield" />
										</Field>
									</Stack>
								</Fieldset>
							</Example>
						</Stack>
					</TabContent>

					<TabContent value="field">
						<Stack gap="xl">
							<Example title="Severity">
								<Stack gap="lg">
									<Field severity="error" message="Enter a valid email address.">
										<Label>Email</Label>
										<Input defaultValue="not-an-email" />
									</Field>
									<Field severity="warning" message="This password is weak.">
										<Label>Password</Label>
										<PasswordInput defaultValue="123456" />
									</Field>
									<Field severity="success" message="Username is available.">
										<Label>Username</Label>
										<Input defaultValue="jane" />
									</Field>
								</Stack>
							</Example>
						</Stack>
					</TabContent>

					<TabContent value="label">
						<Stack gap="xl">
							<Example title="Captioning a control">
								<Field>
									<Label>Full name</Label>
									<Input placeholder="Jane Smith" />
								</Field>
							</Example>
						</Stack>
					</TabContent>

					<TabContent value="description">
						<Stack gap="xl">
							<Example title="Help text">
								<Field>
									<Label>Email</Label>
									<Description>We'll use this for account notifications.</Description>
									<Input type="email" placeholder="jane@example.com" />
								</Field>
							</Example>
						</Stack>
					</TabContent>

					<TabContent value="message">
						<Stack gap="xl">
							<Example title="Severity">
								<Stack gap="lg">
									<Field>
										<Label>Email</Label>
										<Input defaultValue="not-an-email" />
										<Message severity="error">Enter a valid email address.</Message>
									</Field>
									<Field>
										<Label>Password</Label>
										<PasswordInput defaultValue="123456" />
										<Message severity="warning">This password is weak.</Message>
									</Field>
									<Field>
										<Label>Username</Label>
										<Input defaultValue="jane" />
										<Message severity="success">Username is available.</Message>
									</Field>
								</Stack>
							</Example>
						</Stack>
					</TabContent>
				</TabContents>
			</Stack>
		</Tabs>
	)
}
