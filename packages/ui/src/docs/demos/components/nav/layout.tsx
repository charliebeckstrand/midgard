import type { ReactNode } from 'react'
import { TabList } from '../../../../components/tabs'
import { DemoTab, DemoTabPanel, DemoTabs } from '../../../engine'

export function Layout({ children }: { children: ReactNode }) {
	return (
		<DemoTabs>
			<TabList aria-label="Nav examples">
				<DemoTab to="">List</DemoTab>
				<DemoTab to="bar">Bar</DemoTab>
				<DemoTab to="context">Context</DemoTab>
			</TabList>
			<DemoTabPanel>{children}</DemoTabPanel>
		</DemoTabs>
	)
}
