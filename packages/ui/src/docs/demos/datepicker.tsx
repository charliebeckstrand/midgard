import { useState } from 'react'
import { DatePicker } from '../../components/datepicker'
import { Glass } from '../../components/glass'
import { Stack } from '../../components/stack'
import { Example } from '../components/example'

export const meta = { category: 'Forms' }

export default function DatePickerDemo() {
	const [date, setDate] = useState<Date | undefined>(undefined)
	const [range, setRange] = useState<[Date, Date] | undefined>(undefined)
	const [glassRange, setGlassRange] = useState<[Date, Date] | undefined>(undefined)

	return (
		<Stack gap="xl">
			<Example title="Default">
				<DatePicker value={date} onChange={setDate} />
			</Example>

			<Example title="Range">
				<DatePicker range value={range} onChange={setRange} />
			</Example>

			<Example title="Disabled">
				<DatePicker disabled placeholder="Cannot select" />
			</Example>

			<Example title="Glass">
				<Glass>
					<DatePicker range value={glassRange} onChange={setGlassRange} />
				</Glass>
			</Example>
		</Stack>
	)
}
