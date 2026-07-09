import type { ReactNode } from 'react'
import { Stack } from '../../../../components/stack'
import { TabList } from '../../../../components/tabs'
import { DemoTab, DemoTabPanel, DemoTabs } from '../../../engine'

const tabs = [
	{ to: '', label: 'Fieldset' },
	{ to: 'legend', label: 'Legend' },
	{ to: 'field', label: 'Field' },
	{ to: 'label', label: 'Label' },
	{ to: 'description', label: 'Description' },
	{ to: 'message', label: 'Message' },
]

export function Layout({ children }: { children: ReactNode }) {
	return (
		<DemoTabs>
			<Stack gap="lg">
				<TabList aria-label="Fieldset primitives">
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
