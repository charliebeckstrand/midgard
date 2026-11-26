import { ChevronDown } from 'lucide-react'
import { Button } from 'ui/button'
import { Flex } from 'ui/flex'
import { Grid, useGridExportActions } from 'ui/grid'
import { Heading } from 'ui/heading'
import { Icon } from 'ui/icon'
import { Menu, MenuContent, MenuItem, MenuTrigger } from 'ui/menu'
import { Stack } from 'ui/stack'
import { columns, people } from '../data.tsx'

// The export menu sits in the header of the page, outside the grid.
// `useGridExportActions` gives the same Export items as the grid, and
// `exportable={false}` keeps the items of the grid out. The page gives the
// rows to export, because the hook sees no view of the grid.
// This grid does not sort or filter, so the rows of the page are the view,
// and the export reads them as they are. A grid that sorts or filters needs
// the page to hold that state and to export the rows that it shows.
const viewColumns = columns.map((column) => ({ ...column, sortable: false }))

const exportPeople = () => [...people]

export default function PageHeaderMenu() {
	const { actions, pending } = useGridExportActions({
		columns: viewColumns,
		exportRows: exportPeople,
	})

	return (
		<Stack gap="md">
			<Flex align="center" justify="between">
				<Heading level={3}>People</Heading>
				<Menu placement="bottom-end">
					<MenuTrigger>
						<Button variant="outline" loading={pending} suffix={<Icon icon={<ChevronDown />} />}>
							Export
						</Button>
					</MenuTrigger>
					<MenuContent>
						{actions.map((action) => (
							<MenuItem key={action.type} onAction={() => void action.run()}>
								{action.label}
							</MenuItem>
						))}
					</MenuContent>
				</Menu>
			</Flex>
			<Grid
				tableProps={{ 'aria-label': 'People' }}
				exportable={false}
				columns={viewColumns}
				rows={people}
				getKey={(row) => row.id}
			/>
		</Stack>
	)
}
