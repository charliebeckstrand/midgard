import { useState } from 'react'
import { DatePicker } from '../../components/datepicker'
import { Glass } from '../../components/glass'
import { Sizer } from '../../components/sizer'
import { Stack } from '../../components/stack'
import { Example } from '../components/example'

export const meta = { category: 'Forms' }

export default function DatePickerDemo() {
	const [date, setDate] = useState<Date | undefined>(undefined)
	const [range, setRange] = useState<[Date, Date] | undefined>(undefined)
	const [glassRange, setGlassRange] = useState<[Date, Date] | undefined>(undefined)

	return (
		<Stack gap={6}>
			<Example title="Default">
				<Sizer>
					<DatePicker value={date} onChange={setDate} />
				</Sizer>
			</Example>

			<Example title="Range">
				<Sizer>
					<DatePicker range value={range} onChange={setRange} />
				</Sizer>
			</Example>

			<Example title="Disabled">
				<Sizer>
					<DatePicker disabled placeholder="Cannot select" />
				</Sizer>
			</Example>

			<Example title="Glass">
				<Sizer>
					<Glass>
						<DatePicker range value={glassRange} onChange={setGlassRange} />
					</Glass>
				</Sizer>
			</Example>
		</Stack>
	)
}
