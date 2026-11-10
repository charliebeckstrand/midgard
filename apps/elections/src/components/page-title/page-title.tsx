import { Heading } from 'ui/heading'
import { Stack } from 'ui/structure/stack'
import type { OfficeItem } from '../../utilities/trail'
import { OfficeSwitch } from '../office-switch'

/** Props for {@link PageTitle}. */
export type PageTitleProps = {
	heading: string
	items: readonly OfficeItem[]
	/** The value of the current item of the office switch. */
	value: string
}

/**
 * The title row of a page: the heading, and under it the office switch at
 * every width.
 */
export function PageTitle({ heading, items, value }: PageTitleProps) {
	return (
		<Stack gap="lg">
			<Heading level={1}>{heading}</Heading>

			<OfficeSwitch items={items} value={value} />
		</Stack>
	)
}
