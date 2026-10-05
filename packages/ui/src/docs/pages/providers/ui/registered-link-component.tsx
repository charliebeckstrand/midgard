import { Link } from 'ui/link'
import type { LinkProps } from 'ui/primitives/link'
import { UIProvider } from 'ui/providers/ui'

function RouterLink({ children, ...props }: LinkProps) {
	return <a {...props}>{children}</a>
}

export default function RegisteredLinkComponent() {
	return (
		<UIProvider link={RouterLink}>
			<Link href="/providers/ui">Link</Link>
		</UIProvider>
	)
}
