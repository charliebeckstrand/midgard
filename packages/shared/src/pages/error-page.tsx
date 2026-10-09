'use client'

import { Button } from 'ui/button'
import { Flex } from 'ui/structure/flex'
import { Stack } from 'ui/structure/stack'

/**
 * Page of an error that a page throws, such as a `GatewayError` when the
 * gateway does not answer. `retry` renders the page again on the server.
 *
 * @remarks
 * Each app re-exports it as the default export of its `app/error.tsx`.
 */
export function ErrorPage({ retry }: { retry: () => void }) {
	return (
		<Flex justify="center" align="center" className="min-h-dvh grow">
			<Stack align="center" gap="sm" className="px-4 text-center text-xl dark:text-white">
				<div className="text-3xl font-black">Something went wrong</div>
				<div className="font-light text-gray-400">The page could not load. Try again soon.</div>
				<Button onClick={retry}>Try again</Button>
			</Stack>
		</Flex>
	)
}
