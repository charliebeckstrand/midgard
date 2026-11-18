import { Link as ReactRouterLink } from 'react-router'
import { Link } from 'ui/link'
import type { LinkProps } from 'ui/primitives/link'
import { UIProvider } from 'ui/providers/ui'

function RouterLink({ href, ...props }: LinkProps) {
	return <ReactRouterLink to={href} {...props} />
}

export default function RegisteredLinkComponent() {
	return (
		<UIProvider link={RouterLink}>
			<Link href="/providers/ui">UI provider</Link>
		</UIProvider>
	)
}
