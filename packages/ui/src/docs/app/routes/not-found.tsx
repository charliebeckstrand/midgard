import { useLocation } from 'react-router'
import { defineMessage, useIntl } from 'ui/primitives/intl'
import { Text } from 'ui/text'

const bodyMessage = defineMessage<{ path: string }>({
	id: 'docs.notFound.path',
	defaultMessage: 'No page of the docs is at {path}.',
	description:
		'The text of the page that shows for a path that has no page of the docs. The path is the path of the address, such as /button/foo.',
})

/** Any path with no page. The host serves the fallback document, and the router shows this page. */
export default function NotFound() {
	const { pathname } = useLocation()

	const intl = useIntl()

	return <Text>{intl.formatMessage(bodyMessage, { path: pathname })}</Text>
}
