import { Code } from 'ui/code'
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
					<Textarea aria-label="Note" placeholder="Write a note, then open Help." />
				</TabContent>
				<TabContent value="Help">
					<Text tone="muted">
						With <Code>mount="lazy"</Code>, the Draft panel stays mounted, so the note stays.
					</Text>
				</TabContent>
			</TabContents>
		</Tabs>
	)
}
