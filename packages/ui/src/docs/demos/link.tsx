import { Link } from '../../components/link'
import { Stack } from '../../components/stack'
import { Text } from '../../components/text'
import { code } from '../code'
import { Example } from '../components/example'

export const meta = { category: 'Navigation' }

export function Demo() {
	return (
		<Stack gap="xl">
			<Example title="Default">
				<Link href="#link">Read the documentation</Link>
			</Example>

			<Example title="Inline with text">
				<Text>
					For more information, see the <Link href="#link">getting started guide</Link>.
				</Text>
			</Example>

			<Example title="External">
				<Link href="https://example.com" target="_blank" rel="noreferrer">
					example.com
				</Link>
			</Example>

			<Example
				title="With provider"
				code={code`
					import { Link } from 'ui/link'
					import { LinkProvider } from 'ui/providers/link'
					import NextLink from 'next/link'

					<LinkProvider component={NextLink}>
						<App />
					</LinkProvider>

					// Inside App, every Link renders through next/link:
					<Link href="/about">About</Link>
				`}
			>
				<Text variant="muted">
					Register a framework-specific component (e.g. next/link) at the app root via LinkProvider.
					Every Link in the tree renders through it; otherwise Link falls back to a plain anchor.
				</Text>
			</Example>
		</Stack>
	)
}
