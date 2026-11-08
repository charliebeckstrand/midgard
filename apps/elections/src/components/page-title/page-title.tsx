import type { ReactNode } from 'react'
import { Badge } from 'ui/badge'
import { Heading } from 'ui/heading'
import { Flex } from 'ui/structure/flex'
import { Stack } from 'ui/structure/stack'
import type { OfficeItem } from '../../utilities/trail'
import { OfficeSwitch } from '../office-switch'

/** Props for {@link PageTitle}. */
export type PageTitleProps = {
	heading: string
	/** Marks a special election. */
	special?: boolean
	items: readonly OfficeItem[]
	/** The value of the current item of the office switch. */
	value: string
	/** A control at the end of the row of the office switch, such as the color of a map. */
	end?: ReactNode
}

/**
 * The title row of a page: the heading, and under it the office switch at
 * every width. A control in `end` sits at the end of the row of the switch,
 * and under the switch on a phone.
 */
export function PageTitle({ heading, special = false, items, value, end }: PageTitleProps) {
	return (
		<Stack gap="lg">
			<Flex wrap gap="sm">
				<Heading level={1}>{heading}</Heading>

				{special ? <Badge variant="soft">Special</Badge> : null}
			</Flex>

			{end === undefined ? (
				<OfficeSwitch items={items} value={value} />
			) : (
				<Flex
					direction={{ initial: 'col', sm: 'row' }}
					align={{ initial: 'start', sm: 'center' }}
					justify="between"
					gap="md"
				>
					<OfficeSwitch items={items} value={value} />

					{end}
				</Flex>
			)}
		</Stack>
	)
}
