import { Link } from 'ui/link'
import { Stack } from 'ui/stack'
import { Text } from 'ui/text'

/** Any path with no page. The host serves the fallback document, and the router shows this page. */
export default function NotFound() {
	return (
		<Stack gap="sm">
			<Text>No page of the docs is at this path.</Text>
			<Text>
				<Link href="/">See each page</Link>
			</Text>
		</Stack>
	)
}
