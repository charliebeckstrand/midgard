import { Grid } from 'ui/grid'
import { sales, salesColumns } from './data.ts'

export default function AggregationAndTotals() {
	return (
		<Grid
			columns={salesColumns}
			rows={sales}
			getKey={(row) => row.id}
			groupBy={{ value: 'region' }}
			groupTotalRow
			grandTotalRow
		/>
	)
}
