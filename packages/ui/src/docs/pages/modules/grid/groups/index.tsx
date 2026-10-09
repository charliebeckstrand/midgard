import { Stack } from 'ui/stack'
import { Tab, TabContent, TabContents, TabList, Tabs } from 'ui/tabs'
import { Example } from '../../../../kit/index.ts'
import AggregationAndTotals from './aggregation-and-totals.tsx'
import CollapsedGroups from './collapsed-groups.tsx'
import CollapsibleGroups from './collapsible-groups.tsx'
import ColumnGroups from './column-groups.tsx'
import GroupEditor from './group-editor.tsx'
import RowGroups from './row-groups.tsx'
import RowManager from './row-manager.tsx'
import ServerSideGrouping from './server-side-grouping.tsx'

// A second row of tabs splits column groups, which band a run of columns,
// from row groups, which collect the rows by the value of a column.
export default function GroupsTab() {
	return (
		<Tabs defaultValue="column">
			<TabList aria-label="Group type">
				<Tab value="column">Column</Tab>
				<Tab value="row">Row</Tab>
			</TabList>
			<TabContents animate={false}>
				<TabContent value="column">
					<Stack gap="xl">
						<Example of={ColumnGroups} />
						<Example of={CollapsibleGroups} />
						<Example of={GroupEditor} />
					</Stack>
				</TabContent>
				<TabContent value="row">
					<Stack gap="xl">
						<Example of={RowGroups} />
						<Example of={CollapsedGroups} />
						<Example of={AggregationAndTotals} />
						<Example of={RowManager} />
						<Example of={ServerSideGrouping} />
					</Stack>
				</TabContent>
			</TabContents>
		</Tabs>
	)
}
