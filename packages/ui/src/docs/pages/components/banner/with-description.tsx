import { Banner } from 'ui/banner'

export default function WithDescription() {
	return (
		<Banner
			severity="warning"
			title="Scheduled maintenance"
			description="The system will be offline on Sunday from 2:00 AM to 4:00 AM."
			closable={false}
		/>
	)
}
