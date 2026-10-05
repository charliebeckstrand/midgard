import { Tab, TabContent, TabContents, TabList, Tabs, type TabsProps } from 'ui/tabs'
import { Text } from 'ui/text'

const sections = ['Account', 'Notifications', 'Billing']

export default function TabsPlayground(props: TabsProps) {
	return (
		<Tabs defaultValue="Account" {...props}>
			<TabList aria-label="Settings">
				{sections.map((section) => (
					<Tab key={section} value={section}>
						{section}
					</Tab>
				))}
			</TabList>
			<TabContents>
				{sections.map((section) => (
					<TabContent key={section} value={section}>
						<Text tone="muted">{section} settings would go here.</Text>
					</TabContent>
				))}
			</TabContents>
		</Tabs>
	)
}
