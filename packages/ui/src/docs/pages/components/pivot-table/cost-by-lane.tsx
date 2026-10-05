import { PivotTable } from 'ui/pivot-table'
import { useFormat } from 'ui/providers/locale'
import { loads } from './loads.ts'

export default function CostByLane() {
	const currency = useFormat({ type: 'currency', maximumFractionDigits: 0 })

	return (
		<PivotTable
			rows={loads}
			keys={{ row: 'lane', column: 'carrier', value: 'cost' }}
			aggregation="sum"
			format={currency}
			rowHeader="Lane"
			totals="both"
			outline
			aria-label="Cost by lane"
		/>
	)
}
