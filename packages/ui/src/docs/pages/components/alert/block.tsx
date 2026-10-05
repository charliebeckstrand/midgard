import { Alert } from 'ui/alert'

export default function Block() {
	return (
		<Alert
			className="w-full"
			severity="info"
			title="Full-width alert"
			description="This alert stretches to fill its container."
		/>
	)
}
