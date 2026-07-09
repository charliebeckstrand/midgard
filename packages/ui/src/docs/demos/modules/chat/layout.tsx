import type { ReactNode } from 'react'
import { TabList } from '../../../../components/tabs'
import { DemoTab, DemoTabPanel, DemoTabs } from '../../../engine'

const tabs = [
	{ to: '', label: 'Message' },
	{ to: 'prompt', label: 'Prompt' },
	{ to: 'transcript', label: 'Transcript' },
	{ to: 'chat-list', label: 'Chat List' },
]

export function Layout({ children }: { children: ReactNode }) {
	return (
		<DemoTabs>
			<TabList aria-label="Chat module">
				{tabs.map((tab) => (
					<DemoTab key={tab.to} to={tab.to}>
						{tab.label}
					</DemoTab>
				))}
			</TabList>
			<DemoTabPanel>{children}</DemoTabPanel>
		</DemoTabs>
	)
}
