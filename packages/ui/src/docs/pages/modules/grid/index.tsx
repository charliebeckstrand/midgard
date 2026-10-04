import api from 'virtual:docs/api/modules/grid'
import { ApiTable, PageTabs, Playground } from '../../../kit/index.ts'
import GridPlayground from './playground.tsx'

const TABS = [
	'Variants',
	'Sorting',
	'Selection',
	'Events',
	'Reorder',
	'Resize',
	'Expand',
	'Groups',
	'Pin',
	'Lock',
	'Filters',
	'Header',
	'Footer',
	'Toolbar',
	'Export',
	'Sparkline',
	'Pagination',
	'Virtualization',
	'State',
	'Editable',
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
