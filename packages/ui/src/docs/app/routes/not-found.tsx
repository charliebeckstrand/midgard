import { Link } from 'ui/link'
import { defineMessages, IntlMessage } from 'ui/primitives/intl'
import { Stack } from 'ui/stack'
import { Text } from 'ui/text'

const messages = defineMessages({
	body: {
		id: 'docs.notFound.body',
		defaultMessage: 'No page of the docs is at this path.',
		description: 'The text of the page that shows for a path that has no page of the docs.',
	},
	home: {
		id: 'docs.notFound.home',
		defaultMessage: 'See each page',
		description:
			'The text of a link on the not-found page. The link goes to the home page, which lists each page of the docs.',
	},
})

/** Any path with no page. The host serves the fallback document, and the router shows this page. */
export default function NotFound() {
	return (
		<Stack gap="sm">
			<Text>
				<IntlMessage message={messages.body} />
			</Text>
			<Text>
				<Link href="/">
					<IntlMessage message={messages.home} />
				</Link>
			</Text>
		</Stack>
	)
}
