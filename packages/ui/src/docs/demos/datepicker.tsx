import { useState } from 'react'
import { DatePicker } from '../../components/datepicker'
import { Text } from '../../components/text'
import { code } from '../code'
import { Example } from '../example'

export const meta = { category: 'Forms' }

export default function DatePickerDemo() {
	const [date, setDate] = useState<Date | undefined>(undefined)
	const [range, setRange] = useState<[Date, Date] | undefined>(undefined)

	return (
		<div className="space-y-8">
			<Example
				title="Basic"
				code={code`
					import { DatePicker } from 'ui/datepicker'

					const [date, setDate] = useState<Date>()

					<DatePicker value={date} onChange={setDate} />
				`}
			>
				<div className="w-64 space-y-2">
					<DatePicker value={date} onChange={setDate} />
					<Text>{date ? `Selected: ${date.toLocaleDateString()}` : 'No date selected'}</Text>
				</div>
			</Example>

			<Example
				title="Range"
				code={code`
					import { DatePicker } from 'ui/datepicker'

					const [range, setRange] = useState<[Date, Date]>()

					<DatePicker range value={range} onChange={setRange} />
				`}
			>
				<div className="w-64 space-y-2">
					<DatePicker range value={range} onChange={setRange} />
					<Text>
						{range
							? `${range[0].toLocaleDateString()} – ${range[1].toLocaleDateString()}`
							: 'No range selected'}
					</Text>
				</div>
			</Example>

			<Example
				title="Disabled"
				code={code`
					import { DatePicker } from 'ui/datepicker'

					<DatePicker disabled placeholder="Cannot select" />
				`}
			>
				<div className="w-64">
					<DatePicker disabled placeholder="Cannot select" />
				</div>
			</Example>
		</div>
	)
}
