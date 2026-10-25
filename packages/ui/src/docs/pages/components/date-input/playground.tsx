import { DateInput, type DateInputProps } from 'ui/date-input'
import { LocaleProvider } from 'ui/providers/locale'

// The playground shows the field in `en-US`, the locale of the default format.
// The `lang` tells a screen reader to read its text in English.
export default function DateInputPlayground(props: DateInputProps) {
	return (
		<LocaleProvider locale="en-US">
			<div lang="en-US">
				<DateInput aria-label="Ship date" defaultValue={new Date(2026, 5, 15)} {...props} />
			</div>
		</LocaleProvider>
	)
}
