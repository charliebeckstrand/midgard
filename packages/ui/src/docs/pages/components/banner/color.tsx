import { Banner } from 'ui/banner'

// A `color` with no `severity` gives a colored banner with no icon and no ARIA
// role.
export default function Color() {
	return (
		<Banner
			color="blue"
			title="New editor"
			description="Try the new editor in the settings of your workspace."
			closable={false}
		/>
	)
}
