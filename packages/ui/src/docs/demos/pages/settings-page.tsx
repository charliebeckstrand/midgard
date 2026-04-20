'use client'

import { useState } from 'react'
import { Button } from '../../../components/button'
import { Checkbox, CheckboxField, CheckboxGroup } from '../../../components/checkbox'
import { Description, Field, Fieldset, Label } from '../../../components/fieldset'
import { Input } from '../../../components/input'
import { PasswordConfirm, PasswordConfirmInput } from '../../../components/password-confirm'
import { PasswordInput } from '../../../components/password-input'
import { PasswordStrength } from '../../../components/password-strength'
import { Select, SelectLabel, SelectOption } from '../../../components/select'
import { Sizer } from '../../../components/sizer'
import { Stack } from '../../../components/stack'
import { Switch, SwitchField } from '../../../components/switch'
import { Tab, TabContent, TabContents, TabList, Tabs } from '../../../components/tabs'
import { Textarea } from '../../../components/textarea'
import {
	StackedLayout,
	StackedLayoutBody,
	StackedLayoutFooter,
	StackedLayoutHeader,
} from '../../../layouts'
import { Example } from '../../components/example'

export const meta = { category: 'Pages' }

export default function SettingsPageDemo() {
	const [password, setPassword] = useState('')
	const [submitting, setSubmitting] = useState(false)

	const handleSubmit: React.ComponentProps<'form'>['onSubmit'] = (e) => {
		e.preventDefault()

		setSubmitting(true)

		setTimeout(() => setSubmitting(false), 2000)
	}

	return (
		<Example>
			<Tabs defaultValue="profile">
				<form onSubmit={handleSubmit}>
					<StackedLayout>
						<StackedLayoutHeader>
							<TabList>
								<Tab value="profile" disabled={submitting}>
									Profile
								</Tab>
								<Tab value="notifications" disabled={submitting}>
									Notifications
								</Tab>
								<Tab value="security" disabled={submitting}>
									Security
								</Tab>
							</TabList>
						</StackedLayoutHeader>

						<StackedLayoutBody>
							<Fieldset disabled={submitting} className="grid gap-6">
								<TabContents>
									<TabContent value="profile">
										<Sizer size="lg" gap={6}>
											<Field>
												<Label>Full name</Label>
												<Input defaultValue="Jane Smith" />
											</Field>
											<Field>
												<Label>Email</Label>
												<Input type="email" defaultValue="jane@example.com" />
											</Field>
											<Field>
												<Label>Bio</Label>
												<Textarea
													defaultValue="Product designer based in San Francisco."
													rows={3}
												/>
											</Field>
											<Field>
												<Label>Timezone</Label>
												<Select
													defaultValue="America/Los_Angeles"
													displayValue={(v: string) =>
														({
															'America/New_York': 'Eastern Time',
															'America/Chicago': 'Central Time',
															'America/Denver': 'Mountain Time',
															'America/Los_Angeles': 'Pacific Time',
														})[v] ?? v
													}
												>
													<SelectOption value="America/New_York">
														<SelectLabel>Eastern Time</SelectLabel>
													</SelectOption>
													<SelectOption value="America/Chicago">
														<SelectLabel>Central Time</SelectLabel>
													</SelectOption>
													<SelectOption value="America/Denver">
														<SelectLabel>Mountain Time</SelectLabel>
													</SelectOption>
													<SelectOption value="America/Los_Angeles">
														<SelectLabel>Pacific Time</SelectLabel>
													</SelectOption>
												</Select>
											</Field>
										</Sizer>
									</TabContent>

									<TabContent value="notifications">
										<Sizer size="lg" gap={6}>
											<CheckboxGroup>
												<Label>Email notifications</Label>
												<CheckboxField>
													<Checkbox id="notif-updates" defaultChecked />
													<Label htmlFor="notif-updates">Product updates</Label>
												</CheckboxField>
												<CheckboxField>
													<Checkbox id="notif-security" defaultChecked />
													<Label htmlFor="notif-security">Security alerts</Label>
												</CheckboxField>
												<CheckboxField>
													<Checkbox id="notif-marketing" />
													<Label htmlFor="notif-marketing">Marketing emails</Label>
												</CheckboxField>
											</CheckboxGroup>

											<div>
												<Label>Push notifications</Label>
												<Stack gap={3} className="pt-4">
													<SwitchField>
														<Label htmlFor="push-dm">Direct messages</Label>
														<Switch id="push-dm" defaultChecked />
													</SwitchField>
													<SwitchField>
														<Label htmlFor="push-mentions">Mentions</Label>
														<Switch id="push-mentions" defaultChecked />
													</SwitchField>
													<SwitchField>
														<Label htmlFor="push-reminders">Reminders</Label>
														<Switch id="push-reminders" />
													</SwitchField>
												</Stack>
											</div>
										</Sizer>
									</TabContent>

									<TabContent value="security">
										<Sizer size="lg" gap={6}>
											<Field>
												<Label>Current password</Label>
												<PasswordInput placeholder="Enter current password" />
											</Field>
											<PasswordConfirm className="space-y-6" warning="Passwords do not match">
												<Field>
													<Label>New password</Label>
													<PasswordInput
														value={password}
														onChange={(e) => setPassword(e.target.value)}
														placeholder="Enter new password"
													/>
													<PasswordStrength value={password} />
												</Field>
												<Field>
													<Label>Confirm new password</Label>
													<PasswordConfirmInput placeholder="Confirm new password" />
												</Field>
											</PasswordConfirm>
											<SwitchField>
												<Label htmlFor="switch-2fa">Two-factor authentication</Label>
												<Description>Add an extra layer of security to your account</Description>
												<Switch id="switch-2fa" color="green" />
											</SwitchField>
										</Sizer>
									</TabContent>
								</TabContents>
							</Fieldset>
						</StackedLayoutBody>

						<StackedLayoutFooter>
							<Button type="submit" loading={submitting} color="blue" disabled={submitting}>
								{submitting ? 'Saving' : 'Save changes'}
							</Button>
						</StackedLayoutFooter>
					</StackedLayout>
				</form>
			</Tabs>
		</Example>
	)
}
