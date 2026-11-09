import { StatusDot } from 'ui/status'
import { Container } from 'ui/structure/container'
import { Flex } from 'ui/structure/flex'
import { TimeAgo } from 'ui/time-ago'

/** Props for {@link ElectionsFooter}. */
export type ElectionsFooterProps = {
	/** Votes are still counted, so the footer shows a live dot. */
	counting: boolean
	/** The newest update of the results on the page, as an ISO time, or `null` for a page with none. */
	updated: string | null
}

/**
 * The foot of each page. It holds the status, so no page has a status line:
 * on the left a live dot while votes are counted and the age of the newest
 * update; on the right the sources. Under 640px the two stack.
 */
export function ElectionsFooter({ counting, updated }: ElectionsFooterProps) {
	return (
		<footer className="mt-auto border-t border-zinc-950/10 dark:border-white/10">
			<Container size="lg" padding="lg" className="py-4 text-xs/5 text-zinc-500 dark:text-zinc-400">
				<Flex
					direction={{ initial: 'col', sm: 'row' }}
					align={{ initial: 'start', sm: 'center' }}
					justify="between"
					gap={{ initial: 'sm', sm: 'xl' }}
				>
					{updated === null ? (
						<span />
					) : (
						<Flex as="span" gap="sm" className="text-zinc-600 dark:text-zinc-300">
							{counting ? <StatusDot status="active" pulse /> : null}

							<span>
								{counting ? 'Counting' : 'Counted'}
								{', updated '}
								<TimeAgo value={updated} />
							</span>
						</Flex>
					)}

					<span className="sm:text-end">
						<span className="block">
							Results from{' '}
							<a href="https://civicapi.org" className="underline underline-offset-2">
								civicAPI
							</a>
							.
						</span>

						<span className="block">Maps from the US Census Bureau.</span>
					</span>
				</Flex>
			</Container>
		</footer>
	)
}
