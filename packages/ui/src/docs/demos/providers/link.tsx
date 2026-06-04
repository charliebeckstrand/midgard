import { ArrowUpRight } from 'lucide-react'
import { Icon } from '../../../components/icon'
import { Link } from '../../../components/link'
import { Stack } from '../../../components/stack'
import { Text } from '../../../components/text'
import type { LinkProps } from '../../../primitives/link'
import { LinkProvider } from '../../../providers/link'
import { Example } from '../../components/example'

// `name` disambiguates from the Link *component* demo (also "Link").
export const meta = { category: 'Providers', name: 'Link Provider' }

// A stand-in for a framework link (next/link, react-router's Link, …). It
// receives the same props the library would hand any anchor; here it adds a
// marker so you can see <Link> routing through it.
function RouterLink({ children, ...props }: LinkProps) {
	return (
		<a {...props}>
			{children} <Icon icon={<ArrowUpRight />} size="xs" />
		</a>
	)
}

const USAGE = `import { LinkProvider } from 'ui/providers/link'
import NextLink from 'next/link'

// Register your router's link once at the app root. Every <Link> the library
// renders — and every primitive that emits a link — routes through it.
<LinkProvider component={NextLink}>
	<App />
</LinkProvider>

// Without a provider, <Link> falls back to a plain <a>.
<Link href="/docs">Documentation</Link>`

export function Demo() {
	return (
		<Example code={USAGE}>
			<Stack gap="sm">
				<Text variant="muted">Default — renders a plain anchor:</Text>

				<Link href="#providers-link">Documentation</Link>

				<Text variant="muted">
					Wrapped in LinkProvider — routed through a custom component (note the marker):
				</Text>

				<LinkProvider component={RouterLink}>
					<Link href="#providers-link">Documentation</Link>
				</LinkProvider>
			</Stack>
		</Example>
	)
}
