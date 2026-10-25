import { StatusDot, type StatusDotProps } from 'ui/status'
import { serverStatuses } from './server-statuses.ts'

// The label names the status, because color alone does not tell it.
export default function StatusPlayground(props: StatusDotProps) {
	return <StatusDot label={serverStatuses[props.status ?? 'inactive']} {...props} />
}
