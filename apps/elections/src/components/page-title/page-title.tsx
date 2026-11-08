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
}

/**
 * The title row of a page: the heading, and under it the office switch at
 * every width.
 */
export function PageTitle({ heading, special = false, items, value }: PageTitleProps) {
	return (
		<Stack gap="lg">
			<Flex wrap gap="sm">
				<Heading level={1}>{heading}</Heading>

				{special ? <Badge variant="soft">Special</Badge> : null}
			</Flex>

			<OfficeSwitch items={items} value={value} />
		</Stack>
	)
}
