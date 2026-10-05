import { DateInput, type DateInputProps } from 'ui/date-input'
import { LocaleProvider } from 'ui/providers/locale'

export default function DateInputPlayground(props: DateInputProps) {
	return (
		<LocaleProvider locale="en-US">
			<DateInput aria-label="Ship date" defaultValue={new Date(2026, 5, 15)} {...props} />
		</LocaleProvider>
	)
}
