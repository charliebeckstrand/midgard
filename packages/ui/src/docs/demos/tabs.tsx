import { Tab, TabContent, TabContents, TabList, Tabs } from '../../components/tabs'
import { Example } from '../components/example'

export const meta = { category: 'Navigation' }

const tabs = ['Account', 'Notifications', 'Billing']

export default function TabsDemo() {
	return (
		<Example>
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
							<div className="py-4 text-sm text-zinc-500">{tab} settings would go here.</div>
						</TabContent>
					))}
				</TabContents>
			</Tabs>
		</Example>
	)
}
