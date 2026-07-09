import type { ReactNode } from 'react'
import { Stack } from '../../../../components/stack'
import { TabList } from '../../../../components/tabs'
import { DemoTab, DemoTabPanel, DemoTabs } from '../../../engine'

export function Layout({ children }: { children: ReactNode }) {
	return (
		<DemoTabs>
			<Stack gap="lg">
				<TabList aria-label="Progress style">
					<DemoTab to="">Bar</DemoTab>
					<DemoTab to="gauge">Gauge</DemoTab>
				</TabList>
				<DemoTabPanel>{children}</DemoTabPanel>
			</Stack>
		</DemoTabs>
	)
}
