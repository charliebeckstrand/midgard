import { Calendar, CalendarRange } from '../../../components/calendar'
import { DateInput } from '../../../components/date-input'
import { DatePicker } from '../../../components/date-picker'
import { Field, Label, Message } from '../../../components/fieldset'
import { LocaleProvider } from '../../../providers/locale'
import { FixtureCase, FixtureGroup, FixtureSheet } from '../fixture'

// Every date is in March 2026, a month in the past. The calendar marks the day
// of the real clock, and that day is never in this month again.
const SELECTED = new Date(2026, 2, 12)

const RANGE_START = new Date(2026, 2, 9)

const RANGE_END = new Date(2026, 2, 18)

const MIN = new Date(2026, 2, 5)

const MAX = new Date(2026, 2, 25)

export function Sheet() {
	return (
		<LocaleProvider locale="en-US">
			<FixtureSheet title="Dates">
				<FixtureGroup title="Calendar">
					<FixtureCase label="selected">
						<Calendar value={SELECTED} />
					</FixtureCase>
					<FixtureCase label="range">
						<CalendarRange rangeStart={RANGE_START} rangeEnd={RANGE_END} />
					</FixtureCase>
					<FixtureCase label="min and max">
						<Calendar defaultValue={SELECTED} min={MIN} max={MAX} />
					</FixtureCase>
				</FixtureGroup>
				<FixtureGroup title="DatePicker">
					<FixtureCase label="default">
						<DatePicker aria-label="Default" />
					</FixtureCase>
					<FixtureCase label="value">
						<DatePicker aria-label="Value" defaultValue={SELECTED} />
					</FixtureCase>
					<FixtureCase label="range">
						<DatePicker aria-label="Range" range defaultValue={[RANGE_START, RANGE_END]} />
					</FixtureCase>
					<FixtureCase label="disabled">
						<DatePicker aria-label="Disabled" disabled defaultValue={SELECTED} />
					</FixtureCase>
					<FixtureCase label="invalid">
						<Field severity="error">
							<Label>Due date</Label>
							<DatePicker defaultValue={SELECTED} />
							<Message>Pick a date after March 25.</Message>
						</Field>
					</FixtureCase>
					<FixtureCase label="full width" wide>
						<DatePicker
							aria-label="Full width"
							range
							defaultValue={[RANGE_START, RANGE_END]}
							className="w-full"
						/>
					</FixtureCase>
				</FixtureGroup>
				<FixtureGroup title="DateInput">
					<FixtureCase label="default">
						<DateInput aria-label="Default" />
					</FixtureCase>
					<FixtureCase label="value">
						<DateInput aria-label="Value" defaultValue={SELECTED} />
					</FixtureCase>
					<FixtureCase label="disabled">
						<DateInput aria-label="Disabled" disabled defaultValue={SELECTED} />
					</FixtureCase>
					<FixtureCase label="invalid">
						<Field severity="error">
							<Label>Ship date</Label>
							<DateInput defaultValue={SELECTED} />
							<Message>Enter a date after March 25.</Message>
						</Field>
					</FixtureCase>
					<FixtureCase label="full width" wide>
						<DateInput aria-label="Full width" defaultValue={SELECTED} className="w-full" />
					</FixtureCase>
				</FixtureGroup>
			</FixtureSheet>
		</LocaleProvider>
	)
}
