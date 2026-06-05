import { Tab, TabContent, TabContents, TabList, Tabs } from '../../components/tabs'
import { Text } from '../../components/text'
import { Example } from '../components/example'

export const meta = { category: 'Navigation' }

const tabs = ['Account', 'Notifications', 'Billing'] as const

export function Demo() {
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
								<Text variant="muted">{tab} settings would go here.</Text>
							</TabContent>
						))}
					</TabContents>
				</Tabs>
			</Example>
			<Example title="Segment">
				<Tabs defaultValue="Account" variant="segment">
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
								<Text variant="muted">{tab} settings would go here.</Text>
							</TabContent>
						))}
					</TabContents>
				</Tabs>
			</Example>
			<Example title="Stretch">
				<Tabs defaultValue="Account">
					<TabList>
						{tabs.map((tab) => (
							<Tab key={tab} value={tab} stretch>
								{tab}
							</Tab>
						))}
					</TabList>
					<TabContents>
						{tabs.map((tab) => (
							<TabContent key={tab} value={tab}>
								<Text variant="muted">{tab} settings would go here.</Text>
							</TabContent>
						))}
					</TabContents>
				</Tabs>
			</Example>
		</>
	)
}
