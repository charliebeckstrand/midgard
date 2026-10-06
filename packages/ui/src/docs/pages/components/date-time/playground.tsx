import { DateTime, type DateTimeProps } from 'ui/date-time'

export default function DateTimePlayground({
	format = { dateStyle: 'medium', timeStyle: 'short' },
	...props
}: DateTimeProps) {
	return <DateTime {...props} format={format} value="2026-10-04T17:00:00Z" />
}
