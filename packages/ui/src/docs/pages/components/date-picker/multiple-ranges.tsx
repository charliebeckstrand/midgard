import { DatePicker } from 'ui/date-picker'

export default function MultipleRanges() {
	return <DatePicker relative={{ multiple: true }} aria-label="Reporting periods" />
}
