import { Info } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from 'ui/button'
import { Icon } from 'ui/icon'
import { Flex } from 'ui/structure/flex'
import { Stack } from 'ui/structure/stack'
import { Tooltip, TooltipContent, TooltipTrigger } from 'ui/tooltip'

/** Props for {@link CountTip}. */
type CountTipProps = {
	/** The number that the cell shows. */
	count: number
	/** The name of the button that opens the list. */
	label: string
	/** The rows of the list, one for each counted item. */
	children: ReactNode
}

/**
 * A count, and a button whose tooltip lists what the count counts. The Visits
 * column of My places and the Places column of My trips show it. The tooltip
 * opens on a click or a tap, because a hover tooltip does not open on a tap.
 * The grid leaves a click on the button to the button, so it does not open the
 * row. A count of 0 shows no button.
 */
export function CountTip({ count, label, children }: CountTipProps) {
	return (
		<Flex gap="xs" align="center">
			<span>{count}</span>

			{count === 0 ? null : (
				<Tooltip trigger="click">
					<TooltipTrigger>
						<Button type="button" variant="bare" size="sm" aria-label={label}>
							<Icon icon={<Info />} />
						</Button>
					</TooltipTrigger>

					<TooltipContent>
						<Stack gap="xs">{children}</Stack>
					</TooltipContent>
				</Tooltip>
			)}
		</Flex>
	)
}
