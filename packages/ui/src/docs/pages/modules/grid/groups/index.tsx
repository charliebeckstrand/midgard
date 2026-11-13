import { Example } from '../../../../kit/index.ts'
import AggregationAndTotals from './aggregation-and-totals.tsx'
import CollapsedGroups from './collapsed-groups.tsx'
import CollapsibleGroups from './collapsible-groups.tsx'
import ColumnGroups from './column-groups.tsx'
import GroupEditor from './group-editor.tsx'
import RowGroups from './row-groups.tsx'
import RowManager from './row-manager.tsx'
import ServerSideGrouping from './server-side-grouping.tsx'

// The column groups, which band a run of columns, come first. The row groups,
// which collect the rows by the value of a column, come after them.
export default function GroupsTab() {
	return (
		<>
			<Example of={ColumnGroups} />
			<Example of={CollapsibleGroups} />
			<Example of={GroupEditor} />
			<Example of={RowGroups} />
			<Example of={CollapsedGroups} />
			<Example of={AggregationAndTotals} />
			<Example of={RowManager} />
			<Example of={ServerSideGrouping} />
		</>
	)
}
