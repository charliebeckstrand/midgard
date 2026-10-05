import { useState } from 'react'
import { Stack } from 'ui/stack'
import { Tab, TabContent, TabContents, TabList, Tabs } from 'ui/tabs'
import { Text } from 'ui/text'

const sections = ['Profile', 'Activity', 'Invoices']

export default function Preload() {
	const [warmed, setWarmed] = useState<string[]>([])

	return (
		<Stack gap="sm">
			<Tabs defaultValue="Profile">
				<TabList aria-label="Member">
					{sections.map((name) => (
						<Tab
							key={name}
							value={name}
							onPreload={(value) => value && setWarmed((prev) => [...prev, value])}
						>
							{name}
						</Tab>
					))}
				</TabList>
				<TabContents>
					{sections.map((name) => (
						<TabContent key={name} value={name}>
							<Text tone="muted">The {name.toLowerCase()} of the member.</Text>
						</TabContent>
					))}
				</TabContents>
			</Tabs>
			<Text tone="muted">
				Prefetched: {warmed.length > 0 ? warmed.join(', ') : 'none. Point at a tab, or focus it.'}
			</Text>
		</Stack>
	)
}
