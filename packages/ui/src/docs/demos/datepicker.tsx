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
		<Stack gap={8}>
			<Example title="Default">
				<Stack gap={2} className="sm:max-w-72">
					<DatePicker value={date} onChange={setDate} />
				</Stack>
			</Example>

			<Example title="Range">
				<Stack gap={2} className="sm:max-w-72">
					<DatePicker range value={range} onChange={setRange} />
				</Stack>
			</Example>

			<Example title="Disabled">
				<div className="sm:max-w-72">
					<DatePicker disabled placeholder="Cannot select" />
				</div>
			</Example>

			<Example title="Glass">
				<Glass>
					<div className="sm:max-w-72">
						<DatePicker range value={glassRange} onChange={setGlassRange} />
					</div>
				</Glass>
			</Example>
		</Stack>
	)
}
