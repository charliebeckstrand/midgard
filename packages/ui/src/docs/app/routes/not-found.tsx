import { useLocation } from 'react-router'
import { defineMessage, useIntl } from 'ui/primitives/intl'
import { Stack } from 'ui/stack'
import { Text } from 'ui/text'
import { PageSuggestions } from '../../search/ui/page-suggestions.tsx'

const bodyMessage = defineMessage<{ path: string }>({
	id: 'docs.notFound.path',
	defaultMessage: 'No page of the docs is at {path}.',
	description:
		'The text of the page that shows for a path that has no page of the docs. The path is the path of the address, such as /button/foo.',
})

/**
 * Any path with no page. The host serves the fallback document, and the router
 * shows this page, with the pages that the path most likely names.
 */
export default function NotFound() {
	const { pathname } = useLocation()

	const intl = useIntl()

	return (
		<Stack gap="md" align="start">
			<Text>{intl.formatMessage(bodyMessage, { path: pathname })}</Text>
			<PageSuggestions path={pathname} />
		</Stack>
	)
}
