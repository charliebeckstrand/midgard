import { PivotTable, type PivotTableProps } from 'ui/pivot-table'
import { type LoadRow, loads } from './loads.ts'

export default function PivotTablePlayground(props: PivotTableProps<LoadRow>) {
	return (
		<PivotTable
			{...props}
			rows={loads}
			keys={{ row: 'lane', column: 'period', value: 'loads' }}
			rowHeader="Lane"
			aria-label="Loads by lane"
		/>
	)
}
