import api from 'virtual:docs/api/modules/grid'
import { ApiTable, PageTabs, Playground } from '../../../kit/index.ts'
import GridPlayground from './playground.tsx'

const TABS = [
	'Variants',
	'Sorting',
	'Selection',
	'Events',
	'Reordering',
	'Resizing',
	'Expansion',
	'Groups',
	'Pinning',
	'Locking',
	'Filters',
	'Header',
	'Footer',
	'Toolbar',
	'Export',
	'Sparkline',
	'Pagination',
	'Virtualization',
	'State',
	'Editing',
]

export default function GridPage() {
	return (
		<>
			<PageTabs tabs={TABS}>
				<Playground
					of={GridPlayground}
					api={api}
					omit={[
						'groupTotalRow',
						'grandTotalRow',
						'navigable',
						'range',
						'resizable',
						'truncate',
						'loading',
					]}
				/>
			</PageTabs>
			<ApiTable api={api} />
		</>
	)
}
