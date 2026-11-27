import { Grid, type GridColumn } from 'ui/grid'
import { Text } from 'ui/text'
import { PointerHint } from '../../../../kit/pointer-hint.tsx'
import { type Employee, employeeColumns, employees } from '../data.tsx'

const ids = new Set(['name', 'department', 'salary'])

const salaryColumns: GridColumn<Employee>[] = employeeColumns
	.filter((column) => ids.has(String(column.id)))
	.map(({ pinned: _pinned, ...column }) => column)

export default function RangeFigures() {
	// The footer shows the count, the sum, and the average of the range. Select
	// some salaries to see the sum, or names alone to see the count.
	return (
		<>
			<Text tone="muted">
				<PointerHint
					mouseText="Shift-click or drag across the salaries to see their sum and average"
					touchText="Use a keyboard or a mouse to select a range of cells"
				/>
			</Text>
			<Grid
				tableProps={{ 'aria-label': 'Employees' }}
				navigable
				range
				columns={salaryColumns}
				rows={employees}
				getKey={(row) => row.id}
				footer={{ rangeFigures: true }}
			/>
		</>
	)
}
