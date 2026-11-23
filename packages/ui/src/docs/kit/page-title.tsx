import { defineMessage, useIntl } from 'ui/primitives/intl'

// The title of the browser tab on a page: the name of the page, then the name of the docs.
const pageTitleMessage = defineMessage<{ page: string }>({
	id: 'docs.app.pageTitle',
	defaultMessage: '{page} · Docs',
	description:
		'The title of the browser tab on a page of the docs that has no tabs. The page is the name of the page, such as Button, or the text that says that no page is at the address.',
})

// The title of the browser tab on a page with tabs: the name of the tab, the
// name of the page, then the name of the docs. Each tab has its own address,
// so each tab has its own title (WCAG 2.4.2).
const tabTitleMessage = defineMessage<{ tab: string; page: string }>({
	id: 'docs.app.tabTitle',
	defaultMessage: '{tab} · {page} · Docs',
	description:
		'The title of the browser tab on a tab of a page of the docs. The tab is the name of the tab, such as Sorting, and the page is the name of the page, such as Grid.',
})

/**
 * The title of the browser tab for the page with the name `page`. On a page
 * with tabs, `tab` is the name of the current tab, and the title starts with it.
 */
export function PageTitle({ page, tab }: { page: string; tab?: string }) {
	const intl = useIntl()

	return (
		<title>
			{tab === undefined
				? intl.formatMessage(pageTitleMessage, { page })
				: intl.formatMessage(tabTitleMessage, { tab, page })}
		</title>
	)
}
