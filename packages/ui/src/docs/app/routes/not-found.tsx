import { defineMessages, IntlMessage } from 'ui/primitives/intl'
import { Text } from 'ui/text'

const messages = defineMessages({
	body: {
		id: 'docs.notFound.body',
		defaultMessage: 'Page not found',
		description: 'The text of the page that shows for a path that has no page of the docs.',
	},
})

/** Any path with no page. The host serves the fallback document, and the router shows this page. */
export default function NotFound() {
	return (
		<Text>
			<IntlMessage message={messages.body} />
		</Text>
	)
}
