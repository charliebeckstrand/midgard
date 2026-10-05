import { StatusDot, type StatusDotProps } from 'ui/status'

export default function StatusPlayground(props: StatusDotProps) {
	return <StatusDot label="Server status" {...props} />
}
