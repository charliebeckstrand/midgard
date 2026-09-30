import { Tab, TabContent, TabContents, TabList, Tabs } from '../../../components/tabs'
import { Text } from '../../../components/text'
import { Axes, Example } from '../../engine'

const tabs = ['Account', 'Notifications', 'Billing'] as const

export function Demo() {
	return (
		<>
			<Axes
				of="Tabs"
				render={(props, label) => (
					<Tabs {...props} defaultValue="Account">
						<TabList aria-label={label}>
							{tabs.map((tab) => (
								<Tab key={tab} value={tab}>
									{tab}
								</Tab>
							))}
						</TabList>
						<TabContents>
							{tabs.map((tab) => (
								<TabContent key={tab} value={tab}>
									<Text tone="muted">{tab} settings would go here.</Text>
								</TabContent>
							))}
						</TabContents>
					</Tabs>
				)}
			/>

			<Example title="Stretch">
				<Tabs defaultValue="Account">
					<TabList aria-label="Settings">
						{tabs.map((tab) => (
							<Tab key={tab} value={tab} stretch>
								{tab}
							</Tab>
						))}
					</TabList>
					<TabContents>
						{tabs.map((tab) => (
							<TabContent key={tab} value={tab}>
								<Text tone="muted">{tab} settings would go here.</Text>
							</TabContent>
						))}
					</TabContents>
				</Tabs>
			</Example>
		</>
	)
}
