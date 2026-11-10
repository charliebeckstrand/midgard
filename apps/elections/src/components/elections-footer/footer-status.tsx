'use client'

import { useBuildWatch, useRefresh } from 'shared/refresh'
import { StatusDot } from 'ui/status'
import { Flex } from 'ui/structure/flex'
import { TimeAgo } from 'ui/time-ago'

/** The style of a button of the footer: plain text with an underline, as the links of the footer. */
const TEXT_BUTTON =
	'cursor-pointer rounded-sm underline underline-offset-2 disabled:cursor-default disabled:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'

/** Props for {@link FooterStatus}. */
export type FooterStatusProps = {
	/** Votes are still counted, so the status shows an amber dot that pulses. */
	counting: boolean
	/** The newest update of the results on the page, as an ISO time, or `null` for a page with none. */
	updated: string | null
}

/**
 * The status of the count in the footer: the age of the newest update, with a
 * Refresh button that renders the page again in place. A refresh with no
 * answer shows an error toast. After a deploy, the
 * page cannot take new results, so a line under the status names the new
 * build, and its Refresh link reloads the whole page.
 */
export function FooterStatus({ counting, updated }: FooterStatusProps) {
	const newBuild = useBuildWatch()

	const { refresh, pending } = useRefresh()

	return (
		<span className="text-zinc-600 dark:text-zinc-300">
			{updated === null ? null : (
				<Flex as="span" gap="sm">
					{counting ? <StatusDot status="warning" pulse /> : null}

					<span>
						{counting ? 'Counting' : 'Counted'}
						{', updated '}
						<TimeAgo value={updated} />
						{newBuild ? null : (
							<>
								{'. '}
								<button type="button" onClick={refresh} disabled={pending} className={TEXT_BUTTON}>
									{pending ? 'Refreshing…' : 'Refresh'}
								</button>
							</>
						)}
					</span>
				</Flex>
			)}

			{newBuild ? (
				<span className="block">
					{'New build available. '}
					<button type="button" onClick={() => window.location.reload()} className={TEXT_BUTTON}>
						Refresh
					</button>
				</span>
			) : null}
		</span>
	)
}
