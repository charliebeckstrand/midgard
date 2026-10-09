import type { Metadata } from 'next'
import { Flex } from 'ui/structure/flex'
import { Stack } from 'ui/structure/stack'

/**
 * Page of a path that has no route, or of a page that calls `notFound()`.
 *
 * @remarks
 * Each app re-exports it as the default export of its `app/not-found.tsx`,
 * and re-exports {@link notFoundMetadata} as the `metadata` of the page.
 */
export function NotFoundPage() {
	return (
		<Flex justify="center" align="center" className="min-h-dvh grow">
			<Stack align="center" gap="sm" className="px-4 text-center text-xl dark:text-white">
				<div className="text-3xl font-black">404</div>
				<div className="font-light text-gray-400">This page could not be found</div>
			</Stack>
		</Flex>
	)
}

/** The `metadata` of {@link NotFoundPage}. */
export const notFoundMetadata: Metadata = {
	title: '404 - Page Not Found',
}
