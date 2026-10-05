import { DatePicker } from 'ui/date-picker'

export default function RangesAsText() {
	return <DatePicker relative={{ multiple: true, chips: false }} aria-label="Reporting periods" />
}
