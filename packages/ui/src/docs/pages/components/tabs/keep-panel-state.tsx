import { Tab, TabContent, TabContents, TabList, Tabs } from 'ui/tabs'
import { Text } from 'ui/text'
import { Textarea } from 'ui/textarea'

export default function KeepPanelState() {
	return (
		<Tabs defaultValue="Draft">
			<TabList aria-label="Note">
				<Tab value="Draft">Draft</Tab>
				<Tab value="Help">Help</Tab>
			</TabList>
			<TabContents mount="lazy">
				<TabContent value="Draft">
					<Textarea aria-label="Note" placeholder="Write a note, then open Help" />
				</TabContent>
				<TabContent value="Help">
					<Text tone="muted">Your notes are private. Only you can see them.</Text>
				</TabContent>
			</TabContents>
		</Tabs>
	)
}
