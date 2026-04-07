import { useState } from 'react'
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '../../components/tabs'
import { code } from '../code'
import { Example } from '../example'

export const meta = { category: 'Navigation' }

const tabs = ['Account', 'Notifications', 'Billing']

export default function TabsDemo() {
	const [current, setCurrent] = useState('Account')

	return (
		<Example
			code={code`
				import { Tab, TabGroup, TabList, TabPanel, TabPanels } from 'ui/tabs'

				const tabs = ['Account', 'Notifications', 'Billing']

				<TabGroup>
					<TabList>
						{tabs.map((tab) => (
							<Tab key={tab} current={current === tab} onClick={() => setCurrent(tab)}>
								{tab}
							</Tab>
						))}
					</TabList>
					<TabPanels>
						{tabs.map((tab) => (
							<TabPanel key={tab}>
								{current === tab && <div>{tab} settings</div>}
							</TabPanel>
						))}
					</TabPanels>
				</TabGroup>
			`}
		>
			<TabGroup>
				<TabList>
					{tabs.map((tab) => (
						<Tab key={tab} current={current === tab} onClick={() => setCurrent(tab)}>
							{tab}
						</Tab>
					))}
				</TabList>
				<TabPanels>
					{tabs.map((tab) => (
						<TabPanel key={tab}>
							{current === tab && (
								<div className="py-4 text-sm text-zinc-500">{tab} settings would go here.</div>
							)}
						</TabPanel>
					))}
				</TabPanels>
			</TabGroup>
		</Example>
	)
}
