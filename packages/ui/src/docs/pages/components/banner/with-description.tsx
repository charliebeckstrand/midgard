import { Banner } from 'ui/banner'

export default function WithDescription() {
	return (
		<Banner
			severity="warning"
			title="Scheduled maintenance"
			description="The system will be offline on Sunday from 2am to 4am."
			closable={false}
		/>
	)
}
