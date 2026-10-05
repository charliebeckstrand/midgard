import { Alert } from 'ui/alert'

export default function WithDescription() {
	return (
		<Alert
			severity="info"
			title="Scheduled maintenance"
			description="The system will be offline on Sunday from 2am to 4am."
		/>
	)
}
