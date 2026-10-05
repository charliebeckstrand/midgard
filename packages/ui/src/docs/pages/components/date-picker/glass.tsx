import { DatePicker } from 'ui/date-picker'
import { GlassProvider } from 'ui/providers/glass'

export default function Glass() {
	return (
		<GlassProvider>
			<DatePicker range aria-label="Stay dates" />
		</GlassProvider>
	)
}
