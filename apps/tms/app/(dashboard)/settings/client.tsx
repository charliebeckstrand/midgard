'use client'

import { useState } from 'react'
import { Button } from 'ui/button'
import { Field, Label } from 'ui/fieldset'
import { Form } from 'ui/form'
import { Heading } from 'ui/heading'
import { Input } from 'ui/input'
import { Listbox, ListboxLabel, ListboxOption } from 'ui/listbox'
import { Stack } from 'ui/stack'
import { Tab, TabContent, TabContents, TabList, Tabs } from 'ui/tabs'

const themes = [
	{ value: 'light', label: 'Light mode' },
	{ value: 'dark', label: 'Dark mode' },
]

async function simulateAsyncSubmission() {
	return new Promise<void>((r) => setTimeout(r, 1000))
}

function AccountTab() {
	return (
		<Form
			defaultValues={{ name: '', email: '' }}
			onSubmit={async (values) => {
				await simulateAsyncSubmission()
				console.log('account settings', values)
			}}
		>
			<Stack gap={4}>
				<Field autoComplete="name">
					<Label>Name</Label>
					<Input name="name" placeholder="Jane Doe" />
				</Field>
				<Field autoComplete="email">
					<Label>Email</Label>
					<Input name="email" type="email" placeholder="jane@example.com" />
				</Field>
				<Button color="blue" type="submit">
					Save
				</Button>
			</Stack>
		</Form>
	)
}

function PreferencesTab() {
	const [theme, setTheme] = useState<string | undefined>('light')

	return (
		<Field>
			<Label>Theme</Label>
			<Listbox<string>
				value={theme}
				onChange={setTheme}
				displayValue={(v) => themes.find((t) => t.value === v)?.label ?? v}
				placeholder="Select theme"
			>
				{themes.map((option) => (
					<ListboxOption key={option.value} value={option.value}>
						<ListboxLabel>{option.label}</ListboxLabel>
					</ListboxOption>
				))}
			</Listbox>
		</Field>
	)
}

export default function SettingsClient() {
	return (
		<Stack gap={6}>
			<Heading>Settings</Heading>
			<Tabs defaultValue="account">
				<TabList>
					<Tab value="account">Account</Tab>
					<Tab value="preferences">Preferences</Tab>
				</TabList>
				<TabContents>
					<TabContent value="account">
						<AccountTab />
					</TabContent>
					<TabContent value="preferences">
						<PreferencesTab />
					</TabContent>
				</TabContents>
			</Tabs>
		</Stack>
	)
}
