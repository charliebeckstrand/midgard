'use client'

import type { ComponentProps } from 'react'
import type { Orientation } from '../../types'

/** Props for {@link Splitter}. @internal */
export type SplitterProps = Omit<
	ComponentProps<'div'>,
	| 'role'
	| 'tabIndex'
	| 'aria-label'
	| 'aria-orientation'
	| 'aria-valuenow'
	| 'aria-valuemin'
	| 'aria-valuemax'
	| 'aria-valuetext'
	| 'aria-controls'
> & {
	/** The accessible name of the splitter. */
	label: string
	/** The line that the splitter draws, which is not the axis it moves on. */
	orientation: Orientation
	/** The size that the splitter sets, in the unit of `min` and `max`. */
	value: number
	/** The smallest size that the splitter can set. */
	min?: number
	/** The largest size that the splitter can set. Omit it when the size has no maximum. */
	max?: number
	/** The value in words, such as a width in pixels, when the number alone is not clear. */
	valueText?: string
	/** The id of the pane that the splitter sizes, which is the primary pane of the splitter. */
	controls?: string
}

/**
 * A focusable window splitter: `role="separator"` with a tab stop, a name, an
 * orientation, and a value. Each resize handle renders one, and gives it the
 * gesture, the keys, and the grip that it draws.
 *
 * @remarks The WAI-ARIA window splitter pattern gives a focusable separator a
 * value, so a reader hears the size that the handle sets. The props require
 * the name, the orientation, and the value, so no handle can drop one.
 *
 * @internal
 */
export function Splitter({
	label,
	orientation,
	value,
	min,
	max,
	valueText,
	controls,
	children,
	...props
}: SplitterProps) {
	return (
		// biome-ignore lint/a11y/useSemanticElements: an <hr> is void, and a splitter holds the grip that it draws.
		<div
			{...props}
			role="separator"
			tabIndex={0}
			aria-label={label}
			aria-orientation={orientation}
			aria-valuenow={value}
			aria-valuemin={min}
			aria-valuemax={max}
			aria-valuetext={valueText}
			aria-controls={controls}
		>
			{children}
		</div>
	)
}
