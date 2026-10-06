import { DateTime, type DateTimeProps } from 'ui/date-time'

export default function DateTimePlayground(props: DateTimeProps) {
	return (
		<DateTime
			format={{ dateStyle: 'medium', timeStyle: 'short' }}
			{...props}
			value="2026-10-04T17:00:00Z"
		/>
	)
}
