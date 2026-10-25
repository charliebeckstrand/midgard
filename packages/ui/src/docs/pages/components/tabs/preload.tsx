import { useState } from 'react'
import { Stack } from 'ui/stack'
import { Tab, TabContent, TabContents, TabList, Tabs } from 'ui/tabs'
import { Text } from 'ui/text'
import { PointerHint } from '../../../kit/pointer-hint.tsx'

const sections = [
	{ id: 'profile', label: 'Profile', text: 'Mia Chen joined the team in June.' },
	{ id: 'activity', label: 'Activity', text: 'Mia Chen closed three tasks this week.' },
	{ id: 'invoices', label: 'Invoices', text: 'Mia Chen has no open invoices.' },
]

export default function Preload() {
	const [warmed, setWarmed] = useState<string[]>([])

	const labels = warmed.map((id) => sections.find((section) => section.id === id)?.label)

	return (
		<Stack gap="sm">
			<Text tone="muted">
				<PointerHint mouseText="Point at a tab, or focus it." touchText="Tap a tab." />
			</Text>
			<Tabs defaultValue="profile">
				<TabList aria-label="Member">
					{sections.map((section) => (
						<Tab
							key={section.id}
							value={section.id}
							onPreload={(value) => value && setWarmed((prev) => [...prev, value])}
						>
							{section.label}
						</Tab>
					))}
				</TabList>
				<TabContents>
					{sections.map((section) => (
						<TabContent key={section.id} value={section.id}>
							<Text tone="muted">{section.text}</Text>
						</TabContent>
					))}
				</TabContents>
			</Tabs>
			<Text tone="muted">Preloaded: {labels.length > 0 ? labels.join(', ') : 'None'}</Text>
		</Stack>
	)
}
