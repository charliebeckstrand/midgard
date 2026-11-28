import type { ComponentProps } from 'react'
import { k } from '../../recipes/kata/list'
import { ListRevealLineText } from './list-reveal-text'

/** The classes of the description, composed once. @internal */
const DESCRIPTION_CLASS = k().description

/** Props for {@link ListDescription}: native `<span>` attributes. */
export type ListDescriptionProps = ComponentProps<'span'>

/**
 * Secondary supporting text for a {@link ListItem}, rendered as a muted `<span>`
 * on one line. While the description truncates, a hover of the row and a
 * keyboard focus of the Tab stop of the row show the full description in a
 * tooltip.
 */
export function ListDescription(props: ListDescriptionProps) {
	return (
		<ListRevealLineText
			line="description"
			slot="list-description"
			base={DESCRIPTION_CLASS}
			{...props}
		/>
	)
}
