import { useState } from 'react'
import { Stack } from 'ui/stack'
import { Tab, TabContent, TabContents, TabList, Tabs } from 'ui/tabs'
import { Text } from 'ui/text'
import { PointerHint } from '../../../kit/pointer-hint.tsx'

const sections = [
	{ name: 'Profile', text: 'Mia Chen joined the team in June.' },
	{ name: 'Activity', text: 'Mia Chen closed three tasks this week.' },
	{ name: 'Invoices', text: 'Mia Chen has no open invoices.' },
]

export default function Preload() {
	const [warmed, setWarmed] = useState<string[]>([])

	return (
		<Stack gap="sm">
			<Text tone="muted">
				<PointerHint mouse="Point at a tab, or focus it." touch="Tap a tab." />
			</Text>
			<Tabs defaultValue="Profile">
				<TabList aria-label="Member">
					{sections.map((section) => (
						<Tab
							key={section.name}
							value={section.name}
							onPreload={(value) => value && setWarmed((prev) => [...prev, value])}
						>
							{section.name}
						</Tab>
					))}
				</TabList>
				<TabContents>
					{sections.map((section) => (
						<TabContent key={section.name} value={section.name}>
							<Text tone="muted">{section.text}</Text>
						</TabContent>
					))}
				</TabContents>
			</Tabs>
			<Text tone="muted">Preloaded: {warmed.length > 0 ? warmed.join(', ') : 'None'}</Text>
		</Stack>
	)
}
