import { useState } from 'react'
import { Button } from '../../components/button'
import { DatePicker } from '../../components/datepicker'
import { Glass } from '../../components/glass'
import { Sizer } from '../../components/sizer'
import { Stack } from '../../components/stack'
import { Text } from '../../components/text'
import { Example } from '../components/example'

export const meta = { category: 'Forms' }

export default function DatePickerDemo() {
	const [date, setDate] = useState<Date | undefined>(undefined)
	const [range, setRange] = useState<[Date, Date] | undefined>(undefined)
	const [glassRange, setGlassRange] = useState<[Date, Date] | undefined>(undefined)

	return (
		<Stack gap={6}>
			<Example title="Default">
				<Sizer size="sm">
					<DatePicker value={date} onChange={setDate} />
					{date && (
						<Stack gap={2}>
							<Text variant="muted">Selected date: {date.toLocaleDateString()}</Text>
							<Button variant="soft" color="red" onClick={() => setDate(undefined)}>
								Clear
							</Button>
						</Stack>
					)}
				</Sizer>
			</Example>

			<Example title="Range">
				<Sizer size="sm">
					<DatePicker range value={range} onChange={setRange} />
				</Sizer>
				{range && (
					<Stack gap={2}>
						<Text variant="muted">
							Selected date range: {range[0].toLocaleDateString()} - {range[1].toLocaleDateString()}
						</Text>
						<Button variant="soft" color="red" onClick={() => setRange(undefined)}>
							Clear
						</Button>
					</Stack>
				)}
			</Example>

			<Example title="Disabled">
				<DatePicker disabled placeholder="Cannot select" />
			</Example>

			<Example title="Glass">
				<Glass>
					<DatePicker range value={glassRange} onChange={setGlassRange} />
					{glassRange && (
						<Stack gap={2}>
							<Text variant="muted">
								Selected date range: {glassRange[0].toLocaleDateString()} -{' '}
								{glassRange[1].toLocaleDateString()}
							</Text>
							<Button variant="soft" color="red" onClick={() => setGlassRange(undefined)}>
								Clear
							</Button>
						</Stack>
					)}
				</Glass>
			</Example>
		</Stack>
	)
}
