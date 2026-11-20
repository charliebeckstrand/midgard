import { Alert, type AlertProps } from 'ui/alert'

export default function AlertPlayground(props: AlertProps) {
	return <Alert title="Your trial ends in 3 days" {...props} />
}
