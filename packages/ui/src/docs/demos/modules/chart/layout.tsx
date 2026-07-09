import type { ReactNode } from 'react'
import { Stack } from '../../../../components/stack'
import { TabList } from '../../../../components/tabs'
import { DemoTab, DemoTabPanel, DemoTabs } from '../../../engine'

const tabs = [
	{ to: '', label: 'Bar' },
	{ to: 'line', label: 'Line' },
	{ to: 'area', label: 'Area' },
	{ to: 'pie', label: 'Pie' },
	{ to: 'donut', label: 'Donut' },
	{ to: 'combo', label: 'Combo' },
	{ to: 'scatter', label: 'Scatter' },
	{ to: 'bubble', label: 'Bubble' },
	{ to: 'heatmap', label: 'Heatmap' },
	{ to: 'choropleth', label: 'Choropleth' },
]

export function Layout({ children }: { children: ReactNode }) {
	return (
		<DemoTabs>
			<Stack gap="lg">
				<TabList aria-label="Chart kind">
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
