import { useState } from 'react'
import { DatePicker } from '../../components/datepicker'
import { Glass } from '../../components/glass'
import { Example } from '../components/example'

export const meta = { category: 'Forms' }

export default function DatePickerDemo() {
	const [date, setDate] = useState<Date | undefined>(undefined)
	const [range, setRange] = useState<[Date, Date] | undefined>(undefined)

	return (
		<div className="space-y-8">
			<Example title="Default">
				<div className="sm:max-w-72 space-y-2">
					<DatePicker value={date} onChange={setDate} />
				</div>
			</Example>

			<Example title="Range">
				<div className="sm:max-w-72 space-y-2">
					<DatePicker range value={range} onChange={setRange} />
				</div>
			</Example>

			<Example title="Disabled">
				<div className="sm:max-w-72">
					<DatePicker disabled placeholder="Cannot select" />
				</div>
			</Example>

			<Example title="Glass">
				<Glass>
					<div className="sm:max-w-72">
						<DatePicker range value={range} onChange={setRange} />
					</div>
				</Glass>
			</Example>
		</div>
	)
}
