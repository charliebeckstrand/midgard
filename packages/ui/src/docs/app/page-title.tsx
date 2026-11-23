import { defineMessage, useIntl } from 'ui/primitives/intl'

// The title of the browser tab on a page: the name of the page, then the name of the docs.
const pageTitleMessage = defineMessage<{ page: string }>({
	id: 'docs.app.pageTitle',
	defaultMessage: '{page} · Docs',
	description:
		'The title of the browser tab on a page of the docs that has no tabs. The page is the name of the page, such as Button, or the text that says that no page is at the address.',
})

/** The title of the browser tab for the page with the name `page`, without the name of a tab. */
export function PageTitle({ page }: { page: string }) {
	const intl = useIntl()

	return <title>{intl.formatMessage(pageTitleMessage, { page })}</title>
}
