import { useState } from 'react'
import { DatePicker, type DatePickerRelativeValue } from '../../../components/date-picker'
import { GlassProvider } from '../../../providers/glass'
import { Example } from '../../engine'

export function Demo() {
	const [date, setDate] = useState<Date | null>(null)
	const [footerDate, setFooterDate] = useState<Date | null>(null)
	const [range, setRange] = useState<[Date, Date] | null>(null)
	const [typed, setTyped] = useState<Date | null>(null)
	const [relative, setRelative] = useState<DatePickerRelativeValue[] | null>(null)
	const [relativeMany, setRelativeMany] = useState<DatePickerRelativeValue[] | null>(null)
	const [relativeText, setRelativeText] = useState<DatePickerRelativeValue[] | null>(null)
	const [glassRange, setGlassRange] = useState<[Date, Date] | null>(null)

	return (
		<>
			<Example title="Default">
				<DatePicker value={date} onValueChange={setDate} />
			</Example>

			<Example title="Input">
				<DatePicker input value={typed} onValueChange={setTyped} />
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

			<Example title="Relative (text, no chips)">
				<DatePicker
					relative={{ multiple: true, chips: false }}
					value={relativeText}
					onValueChange={setRelativeText}
					placeholder="Select ranges"
				/>
			</Example>

			<Example title="Footer toggles">
				<DatePicker
					footer={{ clear: false, today: false }}
					value={footerDate}
					onValueChange={setFooterDate}
					placeholder="No Clear button"
				/>
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
