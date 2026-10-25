import { StatusDot, type StatusDotProps } from 'ui/status'
import { words } from '../../../data/words.ts'

// The label names the status, because color alone does not tell it.
const labels = words('server-status', {
	inactive: 'Server offline',
	active: 'Server online',
	info: 'Server updating',
	warning: 'Server degraded',
	error: 'Server down',
})

export default function StatusPlayground(props: StatusDotProps) {
	return <StatusDot label={labels[props.status ?? 'inactive']} {...props} />
}
