import { Alert } from 'ui/alert'
import { Button } from 'ui/button'

export default function WithActions() {
	return (
		<Alert
			severity="warning"
			title="Storage is almost full"
			description="You have used 90% of your available storage."
			actions={<Button size="sm">Upgrade</Button>}
		/>
	)
}
