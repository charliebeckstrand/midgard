import type { ReactNode } from 'react'
import { TabList } from '../../../../components/tabs'
import { DemoTab, DemoTabPanel, DemoTabs } from '../../../engine'

// The demo is sectioned into routed tabs so the long example list reads as
// discrete capabilities rather than one scroll — and each capability is its own
// route (`/modules/grid/sorting`) and lazy chunk, loaded when its tab is
// visited (or prefetched on hover). The order here is the tab bar's order; the
// slugs name the page files in this folder.
const tabs = [
	{ to: '', label: 'Variants' },
	{ to: 'sorting', label: 'Sorting' },
	{ to: 'selection', label: 'Selection' },
	{ to: 'events', label: 'Events' },
	{ to: 'reorder', label: 'Reorder' },
	{ to: 'resize', label: 'Resize' },
	{ to: 'expand', label: 'Expand' },
	{ to: 'groups', label: 'Groups' },
	{ to: 'pin', label: 'Pin' },
	{ to: 'lock', label: 'Lock' },
	{ to: 'filters', label: 'Filters' },
	{ to: 'header', label: 'Header' },
	{ to: 'footer', label: 'Footer' },
	{ to: 'toolbar', label: 'Toolbar' },
	{ to: 'export', label: 'Export' },
	{ to: 'sparkline', label: 'Sparkline' },
	{ to: 'pagination', label: 'Pagination' },
	{ to: 'virtualization', label: 'Virtualization' },
	{ to: 'state', label: 'State' },
	{ to: 'editable', label: 'Editable' },
]

export function Layout({ children }: { children: ReactNode }) {
	return (
		<DemoTabs>
			<TabList aria-label="Grid examples">
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
