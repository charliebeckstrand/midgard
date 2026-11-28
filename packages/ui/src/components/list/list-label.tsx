import type { ComponentProps } from 'react'
import { k } from '../../recipes/kata/list'
import { ListRevealLineText } from './list-reveal-text'

/** The classes of the label, composed once. @internal */
const LABEL_CLASS = k().label

/** Props for {@link ListLabel}: native `<span>` attributes. */
export type ListLabelProps = ComponentProps<'span'>

/**
 * Primary text label for a {@link ListItem}, rendered as a styled `<span>` on one
 * line. While the label truncates, a hover of the row and a keyboard focus of
 * the Tab stop of the row show the full label in a tooltip.
 */
export function ListLabel(props: ListLabelProps) {
	return <ListRevealLineText line="label" slot="list-label" base={LABEL_CLASS} {...props} />
}
