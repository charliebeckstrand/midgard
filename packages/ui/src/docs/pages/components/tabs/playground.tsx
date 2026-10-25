import { Tab, TabContent, TabContents, TabList, Tabs, type TabsProps } from 'ui/tabs'
import { Text } from 'ui/text'
import { settings } from './settings.ts'

export default function TabsPlayground(props: TabsProps) {
	return (
		<Tabs defaultValue="account" {...props}>
			<TabList aria-label="Settings">
				{settings.map((section) => (
					<Tab key={section.id} value={section.id}>
						{section.label}
					</Tab>
				))}
			</TabList>
			<TabContents>
				{settings.map((section) => (
					<TabContent key={section.id} value={section.id}>
						<Text tone="muted">{section.text}</Text>
					</TabContent>
				))}
			</TabContents>
		</Tabs>
	)
}
