import { Link } from 'ui/link'
import { Container } from 'ui/structure/container'
import { Flex } from 'ui/structure/flex'
import { FooterStatus, type FooterStatusProps } from './footer-status'

/** The cartographic boundary files of the Census Bureau, the source of the maps of `us-atlas`. */
const CENSUS_URL =
	'https://www.census.gov/geographies/mapping-files/time-series/geo/carto-boundary-file.html'

/** Props for {@link ElectionsFooter}: the status of the count. */
export type ElectionsFooterProps = FooterStatusProps

/**
 * The footer of each page with results. It holds the status of the count, so
 * no page has a status line. On the left are the age of the newest update and,
 * while votes are counted, an amber dot that pulses, as on a race that is not
 * called ({@link FooterStatus}). On the right are the sources, and each link
 * to a source opens in a new tab. Under 640px the two sides stack.
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
					<FooterStatus counting={counting} updated={updated} />

					<span className="sm:text-end">
						<span className="block">
							Results from{' '}
							<Link
								href="https://civicapi.org"
								target="_blank"
								underline
								className="underline-offset-2"
							>
								civicAPI
							</Link>
							.
						</span>

						<span className="block">
							Maps from the{' '}
							<Link href={CENSUS_URL} target="_blank" underline className="underline-offset-2">
								US Census Bureau
							</Link>
							.
						</span>
					</span>
				</Flex>
			</Container>
		</footer>
	)
}
