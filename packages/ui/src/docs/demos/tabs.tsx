import { Tab, TabContent, TabContents, TabList, Tabs } from '../../components/tabs'
import { Text } from '../../components/text'
import { Example } from '../components/example'

export const meta = { category: 'Navigation' }

const tabs = ['Account', 'Notifications', 'Billing']

export default function TabsDemo() {
	return (
		<>
			<Example title="Default">
				<Tabs defaultValue="Account">
					<TabList>
						{tabs.map((tab) => (
							<Tab key={tab} value={tab}>
								{tab}
							</Tab>
						))}
					</TabList>
					<TabContents>
						{tabs.map((tab) => (
							<TabContent key={tab} value={tab}>
								<Text variant="muted" className="py-4">
									{tab} settings would go here.
								</Text>
							</TabContent>
						))}
					</TabContents>
				</Tabs>
			</Example>
			<Example title="Vertical">
				<Tabs defaultValue="Account" orientation="vertical">
					<TabList>
						{tabs.map((tab) => (
							<Tab key={tab} value={tab}>
								{tab}
							</Tab>
						))}
					</TabList>
					<TabContents className="flex-1">
						{tabs.map((tab) => (
							<TabContent key={tab} value={tab}>
								<Text variant="muted" className="py-2">
									{tab} settings would go here.
								</Text>
							</TabContent>
						))}
					</TabContents>
				</Tabs>
			</Example>
		</>
	)
}
