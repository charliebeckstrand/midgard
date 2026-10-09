import { StatusDot, type StatusDotProps } from 'ui/status'

// The label names the status, because color alone does not tell it.
const labels = {
	inactive: 'Server offline',
	active: 'Server online',
	info: 'Server updating',
	warning: 'Server degraded',
	error: 'Server down',
} as const

export default function StatusPlayground(props: StatusDotProps) {
	return <StatusDot label={labels[props.status ?? 'inactive']} {...props} />
}
