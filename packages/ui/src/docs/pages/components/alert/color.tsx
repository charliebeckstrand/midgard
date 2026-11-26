import { Alert } from 'ui/alert'

// A `color` with no `severity` gives a colored alert with no icon and no ARIA
// role.
export default function Color() {
	return (
		<Alert
			color="blue"
			title="New editor"
			description="Try the new editor in the settings of your workspace."
		/>
	)
}
