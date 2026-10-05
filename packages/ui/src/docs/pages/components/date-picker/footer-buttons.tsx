import { DatePicker } from 'ui/date-picker'

export default function FooterButtons() {
	return <DatePicker footer={{ today: false }} aria-label="Due date" />
}
