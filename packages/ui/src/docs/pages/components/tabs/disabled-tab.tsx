import { Tab, TabContent, TabContents, TabList, Tabs } from 'ui/tabs'
import { Text } from 'ui/text'

export default function DisabledTab() {
	return (
		<Tabs defaultValue="Overview">
			<TabList aria-label="Project">
				<Tab value="Overview">Overview</Tab>
				<Tab value="Analytics">Analytics</Tab>
				<Tab value="Reports" disabled>
					Reports
				</Tab>
			</TabList>
			<TabContents>
				<TabContent value="Overview">
					<Text tone="muted">The project at a glance. Reports open on the Pro plan.</Text>
				</TabContent>
				<TabContent value="Analytics">
					<Text tone="muted">Visits and conversions for the last 30 days.</Text>
				</TabContent>
			</TabContents>
		</Tabs>
	)
}
