import { Banner } from 'ui/banner'
import { Button } from 'ui/button'

export default function WithActions() {
	return (
		<Banner
			severity="info"
			title="New version available"
			description="Version 2.0 has been released with new features and improvements."
			actions={<Button size="sm">Update now</Button>}
			closable={false}
		/>
	)
}
