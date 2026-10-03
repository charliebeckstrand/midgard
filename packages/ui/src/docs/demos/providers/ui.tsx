import { Link } from '../../../components/link'
import type { LinkProps } from '../../../primitives/link'
import { UIProvider } from '../../../providers/ui'
import { Example } from '../../engine'

export const meta = { name: 'UI' }

const RouterLink = ({ children, ...props }: LinkProps) => <a {...props}>{children}</a>

function RegisteredLinkExample() {
	return (
		<UIProvider link={RouterLink}>
			<Link href="/providers-ui">Link</Link>
		</UIProvider>
	)
}

export function Demo() {
	return (
		<>
			<Example title="Default link component">
				<Link href="/providers-ui">Link</Link>
			</Example>

			<Example title="Link component registered through UIProvider">
				<RegisteredLinkExample />
			</Example>
		</>
	)
}
