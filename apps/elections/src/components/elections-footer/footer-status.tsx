'use client'

import { useBuildWatch } from 'shared/refresh'
import { StatusDot } from 'ui/status'
import { Flex } from 'ui/structure/flex'
import { TimeAgo } from 'ui/time-ago'

/** The style of the Refresh button of a new build: plain text with an underline, as the links of the footer. */
const TEXT_BUTTON =
	'cursor-pointer rounded-sm underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'

/** Props for {@link FooterStatus}. */
export type FooterStatusProps = {
	/** Votes are still counted, so the status shows an amber dot that pulses. */
	counting: boolean
	/** The newest update of the results on the page, as an ISO time, or `null` for a page with none. */
	updated: string | null
}

/**
 * The status of the count in the footer: the age of the newest update. After
 * a deploy, a line under the status names the new build, and its Refresh
 * button reloads the whole page.
 */
export function FooterStatus({ counting, updated }: FooterStatusProps) {
	const newBuild = useBuildWatch()

	return (
		<span className="text-zinc-600 dark:text-zinc-300">
			{updated === null ? null : (
				<Flex as="span" gap="sm">
					{counting ? <StatusDot status="warning" pulse /> : null}

					<span>
						{counting ? 'Counting' : 'Counted'}
						{', updated '}
						<TimeAgo value={updated} />
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
