import type { ReactNode } from 'react'
import { Stack } from '../../../../components/stack'
import { TabList } from '../../../../components/tabs'
import { DemoTab, DemoTabPanel, DemoTabs } from '../../../engine'

export function Layout({ children }: { children: ReactNode }) {
	return (
		<DemoTabs>
			<Stack gap="lg">
				<TabList aria-label="Sparkline style">
					<DemoTab to="">Line</DemoTab>
					<DemoTab to="bar">Bar</DemoTab>
				</TabList>
				<DemoTabPanel>{children}</DemoTabPanel>
			</Stack>
		</DemoTabs>
	)
}
