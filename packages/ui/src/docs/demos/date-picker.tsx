import { useState } from 'react'
import { DatePicker, type DatePickerRelativeValue } from '../../components/date-picker'
import { GlassProvider } from '../../providers/glass'
import { Example } from '../components/example'

export function Demo() {
	const [date, setDate] = useState<Date | undefined>(undefined)
	const [range, setRange] = useState<[Date, Date] | undefined>(undefined)
	const [typed, setTyped] = useState<Date | undefined>(undefined)
	const [relative, setRelative] = useState<DatePickerRelativeValue | undefined>(undefined)
	const [relativeMany, setRelativeMany] = useState<DatePickerRelativeValue[] | undefined>(undefined)
	const [glassRange, setGlassRange] = useState<[Date, Date] | undefined>(undefined)

	return (
		<>
			<Example title="Default">
				<DatePicker value={date} onValueChange={setDate} />
			</Example>

			<Example title="Range">
				<DatePicker range value={range} onValueChange={setRange} placeholder="Select date range" />
			</Example>

			<Example title="Relative">
				<DatePicker
					relative
					value={relative}
					onValueChange={setRelative}
					placeholder="Select range"
				/>
			</Example>

			<Example title="Relative (multiple)">
				<DatePicker
					relative={{ multiple: true }}
					value={relativeMany}
					onValueChange={setRelativeMany}
					placeholder="Select ranges"
				/>
			</Example>

			<Example title="With input">
				<DatePicker input value={typed} onValueChange={setTyped} />
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
