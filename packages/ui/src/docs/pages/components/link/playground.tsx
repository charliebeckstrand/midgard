import { Link, type LinkProps } from 'ui/link'

export default function LinkPlayground(props: LinkProps) {
	return (
		<Link {...props} href="/link">
			View all components
		</Link>
	)
}
