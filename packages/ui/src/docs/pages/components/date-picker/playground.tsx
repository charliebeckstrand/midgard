import { DatePicker, type DatePickerProps } from 'ui/date-picker'

export default function DatePickerPlayground(props: DatePickerProps) {
	return <DatePicker aria-label="Due date" {...props} />
}
