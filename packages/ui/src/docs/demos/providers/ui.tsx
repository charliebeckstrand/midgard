import { Link } from '../../../components/link'
import type { LinkProps } from '../../../primitives/link'
import { UIProvider } from '../../../providers/ui'
import { Example } from '../../components/example'

// `name` disambiguates from the Link *component* demo (also "Link"); the root
// `UIProvider` is where an app registers its framework link component.
export const meta = { category: 'Providers', name: 'UI Provider' }

function RegisteredLinkExample() {
	const RouterLink = ({ children, ...props }: LinkProps) => <a {...props}>{children}</a>

	return (
		<UIProvider link={RouterLink}>
			<Link href="#providers-ui">Documentation</Link>
		</UIProvider>
	)
}

export function Demo() {
	return (
		<>
			<Example title="Default link component">
				<Link href="#providers-ui">Documentation</Link>
			</Example>

			<Example title="Link component registered through UIProvider">
				<RegisteredLinkExample />
			</Example>
		</>
	)
}
