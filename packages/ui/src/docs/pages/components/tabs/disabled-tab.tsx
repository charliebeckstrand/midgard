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
					<Text tone="muted">
						Track the tasks of the project. Upgrade to the Pro plan to open reports.
					</Text>
				</TabContent>
				<TabContent value="Analytics">
					<Text tone="muted">See the visits and the conversions of the last 30 days.</Text>
				</TabContent>
			</TabContents>
		</Tabs>
	)
}
