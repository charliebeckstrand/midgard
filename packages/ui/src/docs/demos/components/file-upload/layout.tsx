import type { ReactNode } from 'react'
import { Stack } from '../../../../components/stack'
import { TabList } from '../../../../components/tabs'
import { DemoTab, DemoTabPanel, DemoTabs } from '../../../engine'

const tabs = [
	{ to: '', label: 'Drop' },
	{ to: 'input', label: 'Input' },
	{ to: 'button', label: 'Button' },
]

export function Layout({ children }: { children: ReactNode }) {
	return (
		<DemoTabs>
			<Stack gap="lg">
				<TabList aria-label="FileUpload variant">
					{tabs.map((tab) => (
						<DemoTab key={tab.to} to={tab.to}>
							{tab.label}
						</DemoTab>
					))}
				</TabList>
				<DemoTabPanel>{children}</DemoTabPanel>
			</Stack>
		</DemoTabs>
	)
}
