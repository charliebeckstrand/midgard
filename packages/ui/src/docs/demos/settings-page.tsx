'use client'

import { useState } from 'react'
import { Button } from '../../components/button'
import { Checkbox, CheckboxField, CheckboxGroup } from '../../components/checkbox'
import { Description, Field, Label } from '../../components/fieldset'
import { Heading } from '../../components/heading'
import { Input } from '../../components/input'
import { Select, SelectLabel, SelectOption } from '../../components/select'
import { Sizer } from '../../components/sizer'
import { Stack } from '../../components/stack'
import { Switch, SwitchField } from '../../components/switch'
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '../../components/tabs'
import { Textarea } from '../../components/textarea'
import { SettingsPage } from '../../pages'
import { Example } from '../components/example'

export const meta = { category: 'Layout' }

type TabId = 'profile' | 'notifications' | 'security'

export default function SettingsPageDemo() {
	const [tab, setTab] = useState<TabId>('profile')
	const [submitting, setSubmitting] = useState(false)

	const handleSubmit: React.ComponentProps<'form'>['onSubmit'] = (e) => {
		e.preventDefault()

		setSubmitting(true)

		setTimeout(() => setSubmitting(false), 2000)
	}

	const tabs = (
		<TabGroup>
			<TabList>
				<Tab current={tab === 'profile'} onClick={() => setTab('profile')}>
					Profile
				</Tab>
				<Tab current={tab === 'notifications'} onClick={() => setTab('notifications')}>
					Notifications
				</Tab>
				<Tab current={tab === 'security'} onClick={() => setTab('security')}>
					Security
				</Tab>
			</TabList>
		</TabGroup>
	)

	return (
		<Example>
			<SettingsPage
				heading={<Heading>Settings</Heading>}
				tabs={tabs}
				onSubmit={handleSubmit}
				submitting={submitting}
				actions={
					<Button type="submit" color="blue" disabled={submitting}>
						{submitting ? 'Saving...' : 'Save changes'}
					</Button>
				}
			>
				<TabGroup>
					<TabPanels>
						<TabPanel hidden={tab !== 'profile'}>
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
									<Textarea defaultValue="Product designer based in San Francisco." rows={3} />
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
						</TabPanel>

						<TabPanel hidden={tab !== 'notifications'}>
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
									<Stack gap={3} className="pt-2">
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
						</TabPanel>

						<TabPanel hidden={tab !== 'security'}>
							<Sizer size="lg" gap={6}>
								<Field>
									<Label>Current password</Label>
									<Input type="password" placeholder="Enter current password" />
								</Field>
								<Field>
									<Label>New password</Label>
									<Input type="password" placeholder="Enter new password" />
								</Field>
								<Field>
									<Label>Confirm new password</Label>
									<Input type="password" placeholder="Confirm new password" />
								</Field>
								<SwitchField>
									<Label htmlFor="switch-2fa">Two-factor authentication</Label>
									<Description>Add an extra layer of security to your account</Description>
									<Switch id="switch-2fa" />
								</SwitchField>
							</Sizer>
						</TabPanel>
					</TabPanels>
				</TabGroup>
			</SettingsPage>
		</Example>
	)
}
