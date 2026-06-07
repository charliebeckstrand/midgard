import { useState } from 'react'
import { DatePicker } from '../../components/date-picker'
import { GlassProvider } from '../../providers/glass'
import { Example } from '../components/example'

export const meta = { category: 'Forms' }

export function Demo() {
	const [date, setDate] = useState<Date | undefined>(undefined)
	const [range, setRange] = useState<[Date, Date] | undefined>(undefined)
	const [glassRange, setGlassRange] = useState<[Date, Date] | undefined>(undefined)

	return (
		<>
			<Example title="Default">
				<DatePicker value={date} onValueChange={setDate} />
			</Example>

			<Example title="Range">
				<DatePicker range value={range} onValueChange={setRange} placeholder="Select date range" />
			</Example>

			<Example title="Disabled">
				<DatePicker disabled placeholder="Cannot select" />
			</Example>

			<Example title="Glass">
				<GlassProvider>
					<DatePicker
						range
						value={glassRange}
						onValueChange={setGlassRange}
						placeholder="Select date range"
					/>
				</GlassProvider>
			</Example>
		</>
	)
}
