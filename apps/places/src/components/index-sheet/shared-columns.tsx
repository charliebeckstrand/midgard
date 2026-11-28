import { Info } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from 'ui/button'
import type { ContextMenuEntry } from 'ui/context-menu'
import { Icon } from 'ui/icon'
import type { GridColumn } from 'ui/modules/grid'
import { Flex } from 'ui/structure/flex'
import { Stack } from 'ui/structure/stack'
import { Tooltip, TooltipContent, TooltipTrigger } from 'ui/tooltip'
import { PlaceMenu } from '../place-menu'

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

/**
 * The actions column of My places and My trips: the ellipsis menu of each row.
 *
 * @param items - The rows of the menu of a record.
 * @param name - The name of a record, which names its menu.
 */
export function actionsColumn<T>(
	items: (row: T) => ContextMenuEntry[],
	name: (row: T) => string,
): GridColumn<T> {
	return {
		id: 'actions',
		// The ellipsis says what the column is, so the header names it for a
		// screen reader alone.
		title: <span className="sr-only">Actions</span>,
		// The grid does not size an `actions` column to its content. Without a
		// `width`, the column takes the default of 150px. This width holds the
		// ellipsis button (38px at the `md` step) and the cell padding (8px on
		// each side).
		width: 54,
		actions: (row) => <PlaceMenu items={items(row)} aria-label={`Actions for ${name(row)}`} />,
	}
}
