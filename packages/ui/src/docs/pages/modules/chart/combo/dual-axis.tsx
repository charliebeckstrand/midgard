import { ComboChart } from 'ui/chart'
import { operations } from '../data.ts'

export default function DualAxis() {
	return (
		<ComboChart
			aria-label="Shipments and exceptions by week"
			data={operations}
			series={[
				{ type: 'area', xKey: 'week', yKey: 'shipments', yName: 'Shipments' },
				{ type: 'line', xKey: 'week', yKey: 'exceptions', yName: 'Exceptions', axis: 'y2' },
			]}
			axes={{ y: { title: 'Shipments' }, y2: { title: 'Exceptions' } }}
		/>
	)
}
