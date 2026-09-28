'use client'

import type { ComponentProps } from 'react'
import type { Orientation } from '../../types'

/** Props for {@link PanelSplitter}. @internal */
export type PanelSplitterProps = Omit<ComponentProps<'div'>, 'role' | 'tabIndex'> & {
	/** The line the separator draws, which is not the axis it moves on. */
	'aria-orientation': Orientation
	'aria-label': string
	/** The size that the separator sets, in the unit of `aria-valuemin` and `aria-valuemax`. */
	'aria-valuenow': number | undefined
}

/**
 * A focusable window splitter: `role="separator"` with a tab stop and a value.
 * Each resize handle renders one, and gives it the drag, the keys, and the grip
 * that it draws.
 *
 * @remarks The WAI-ARIA window splitter pattern gives a focusable separator a
 * value, so a reader hears the size that the handle sets. The props require
 * the orientation, the name, and the value, so no handle can drop one.
 *
 * @internal
 */
export function PanelSplitter({ 'aria-valuenow': value, children, ...props }: PanelSplitterProps) {
	return (
		// biome-ignore lint/a11y/useSemanticElements: an <hr> is void, and a splitter holds the grip that it draws.
		<div {...props} role="separator" aria-valuenow={value} tabIndex={0}>
			{children}
		</div>
	)
}
