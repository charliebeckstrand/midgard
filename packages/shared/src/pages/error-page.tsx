'use client'

import { useEffect } from 'react'
import { Button } from 'ui/button'
import { reportBug } from 'ui/events'
import { defineMessages, useIntl } from 'ui/primitives/intl'
import { Flex } from 'ui/structure/flex'
import { Stack } from 'ui/structure/stack'

const messages = defineMessages({
	title: {
		id: 'shared.error.title',
		defaultMessage: 'Something went wrong',
		description: 'The title of the page that shows when a page fails.',
	},
	body: {
		id: 'shared.error.body',
		defaultMessage: 'The page could not load. Try again soon.',
		description: 'The text under the title of the page that shows when a page fails.',
	},
	retry: {
		id: 'shared.error.retry',
		defaultMessage: 'Try again',
		description: 'The button that loads a failed page again.',
	},
})

/**
 * Page of an error that a page throws, such as a `GatewayError` when the
 * gateway does not answer. `retry` renders the page again on the server.
 *
 * @remarks
 * Each app re-exports it as the default export of its `app/error.tsx`.
 * Next.js only logs an error that this boundary catches, so the page reports
 * it to the events as a caught bug. While the events are off, the report
 * does nothing.
 */
export function ErrorPage({ error, retry }: { error: Error; retry: () => void }) {
	const intl = useIntl()

	useEffect(() => {
		reportBug(error)
	}, [error])

	return (
		<Flex justify="center" align="center" className="min-h-dvh grow">
			<Stack align="center" gap="sm" className="px-4 text-center text-xl dark:text-white">
				<div className="text-3xl font-black">{intl.formatMessage(messages.title)}</div>
				<div className="font-light text-gray-400">{intl.formatMessage(messages.body)}</div>
				<Button onClick={retry}>{intl.formatMessage(messages.retry)}</Button>
			</Stack>
		</Flex>
	)
}
