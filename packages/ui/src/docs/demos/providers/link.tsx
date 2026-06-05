import { Link } from '../../../components/link'
import type { LinkProps } from '../../../primitives/link'
import { LinkProvider } from '../../../providers/link'
import { Example } from '../../components/example'

// `name` disambiguates from the Link *component* demo (also "Link").
export const meta = { category: 'Providers', name: 'Link Provider' }

function LinkProviderExample() {
	const RouterLink = ({ children, ...props }: LinkProps) => <a {...props}>{children}</a>

	return (
		<LinkProvider component={RouterLink}>
			<Link href="#providers-link">Documentation</Link>
		</LinkProvider>
	)
}

export function Demo() {
	return (
		<>
			<Example title="Default Link component">
				<Link href="#providers-link">Documentation</Link>
			</Example>

			<Example title="Link component with custom provider">
				<LinkProviderExample />
			</Example>
		</>
	)
}
