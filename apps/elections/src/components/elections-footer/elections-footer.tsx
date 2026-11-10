import { Link } from 'ui/link'
import { StatusDot } from 'ui/status'
import { Container } from 'ui/structure/container'
import { Flex } from 'ui/structure/flex'
import { TimeAgo } from 'ui/time-ago'
import { NewBuildRefresh } from './new-build-refresh'

/** Props for {@link ElectionsFooter}. */
export type ElectionsFooterProps = {
	/** Votes are still counted, so the footer shows an amber dot that pulses. */
	counting: boolean
	/** The newest update of the results on the page, as an ISO time, or `null` for a page with none. */
	updated: string | null
}

/**
 * The footer of each page with results. It holds the status of the count, so
 * no page has a status line. On the left are the age of the newest update and,
 * while votes are counted, an amber dot that pulses, as on a race that is not
 * called. Under the status, after a deploy, a notice of the new build has a
 * link that reloads the page. On the right are the sources. Under 640px the
 * two sides stack.
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
					<span>
						{updated === null ? null : (
							<Flex as="span" gap="sm" className="text-zinc-600 dark:text-zinc-300">
								{counting ? <StatusDot status="warning" pulse /> : null}

								<span>
									{counting ? 'Counting' : 'Counted'}
									{', updated '}
									<TimeAgo value={updated} />
								</span>
							</Flex>
						)}

						<NewBuildRefresh />
					</span>

					<span className="sm:text-end">
						<span className="block">
							Results from{' '}
							<Link href="https://civicapi.org" underline className="underline-offset-2">
								civicAPI
							</Link>
							.
						</span>

						<span className="block">Maps from the US Census Bureau.</span>
					</span>
				</Flex>
			</Container>
		</footer>
	)
}
