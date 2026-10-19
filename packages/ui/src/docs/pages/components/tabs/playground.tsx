import { Tab, TabContent, TabContents, TabList, Tabs, type TabsProps } from 'ui/tabs'
import { Text } from 'ui/text'
import { settings } from './settings.ts'

export default function TabsPlayground(props: TabsProps) {
	return (
		<Tabs defaultValue="Account" {...props}>
			<TabList aria-label="Settings">
				{settings.map((section) => (
					<Tab key={section.name} value={section.name}>
						{section.name}
					</Tab>
				))}
			</TabList>
			<TabContents>
				{settings.map((section) => (
					<TabContent key={section.name} value={section.name}>
						<Text tone="muted">{section.text}</Text>
					</TabContent>
				))}
			</TabContents>
		</Tabs>
	)
}
