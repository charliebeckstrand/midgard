import { ExternalLink } from 'lucide-react'
import { IconButton } from 'ui/icon-button'

export default function AsLink() {
	return (
		<IconButton
			icon={<ExternalLink />}
			aria-label="Open the repository"
			href="https://github.com"
			target="_blank"
			tooltip
		/>
	)
}
