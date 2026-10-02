import { useState } from 'react'
import { DatePicker, type DatePickerRelativeValue } from '../../../components/date-picker'
import { GlassProvider } from '../../../providers/glass'
import { Axes, Example } from '../../engine'

const launch = new Date(2026, 0, 15)

export function Demo() {
	const [date, setDate] = useState<Date | null>(null)
	const [footerDate, setFooterDate] = useState<Date | null>(null)
	const [range, setRange] = useState<[Date, Date] | null>(null)
	const [relative, setRelative] = useState<DatePickerRelativeValue[] | null>(null)
	const [relativeMany, setRelativeMany] = useState<DatePickerRelativeValue[] | null>(null)
	const [relativeText, setRelativeText] = useState<DatePickerRelativeValue[] | null>(null)
	const [glassRange, setGlassRange] = useState<[Date, Date] | null>(null)

	return (
		<>
			{/* A date label is short, so `truncate` shows no change. The `format` prop
			    applies only with `input`, so it is not an axis. */}
			<Axes
				of="DatePicker"
				omit={['placement', 'open', 'defaultOpen', 'range', 'truncate', 'format']}
				render={(props, label) => (
					<DatePicker {...props} aria-label={label} defaultValue={launch} />
				)}
			/>

			<Example title="Controlled">
				<DatePicker aria-label="Due date" value={date} onValueChange={setDate} />
			</Example>

			<Example title="Range">
				<DatePicker
					range
					aria-label="Stay dates"
					value={range}
					onValueChange={setRange}
					placeholder="Select date range"
				/>
			</Example>

			<Example title="Relative">
				<DatePicker
					relative
					aria-label="Reporting range"
					value={relative}
					onValueChange={setRelative}
					placeholder="Select range"
				/>
			</Example>

			<Example title="Relative (multiple)">
				<DatePicker
					relative={{ multiple: true }}
					aria-label="Reporting ranges"
					value={relativeMany}
					onValueChange={setRelativeMany}
					placeholder="Select ranges"
				/>
			</Example>

			<Example title="Relative (text, no chips)">
				<DatePicker
					relative={{ multiple: true, chips: false }}
					aria-label="Reporting ranges"
					value={relativeText}
					onValueChange={setRelativeText}
					placeholder="Select ranges"
				/>
			</Example>

			<Example title="Footer toggles">
				<DatePicker
					footer={{ clear: false, today: false }}
					aria-label="Due date"
					value={footerDate}
					onValueChange={setFooterDate}
					placeholder="No Clear button"
				/>
			</Example>

			<Example title="Glass">
				<GlassProvider>
					<DatePicker
						range
						aria-label="Stay dates"
						value={glassRange}
						onValueChange={setGlassRange}
						placeholder="Select date range"
					/>
				</GlassProvider>
			</Example>
		</>
	)
}
