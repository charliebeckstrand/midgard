'use client'

import type { ComponentProps } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/splitter'
import type { Orientation } from '../../types'

/** Props for {@link Splitter}. @internal */
export type SplitterProps = Omit<
	ComponentProps<'hr'>,
	| 'children'
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
	/**
	 * The largest size that the splitter can set. Omit it when the size has no
	 * maximum. The splitter then reports `Number.MAX_SAFE_INTEGER`, so the value
	 * stays in its range. Without a maximum, the ARIA default of 100 applies, and
	 * a value such as a width of 320 pixels is out of range. Give `valueText` too,
	 * because a percentage of that range means nothing to the reader.
	 */
	max?: number
	/** The value in words, such as a width in pixels, when the number alone is not clear. */
	valueText?: string
	/** The id of the pane that the splitter sizes, which is the primary pane of the splitter. */
	controls?: string
}

/**
 * A focusable window splitter: an `<hr>` with a tab stop, a name, an
 * orientation, and a value. Each resize handle renders one, and gives it the
 * gesture, the keys, and the grip, which it draws as the `::after` of the
 * splitter.
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
	className,
	...props
}: SplitterProps) {
	return (
		<hr
			{...props}
			className={cn(k().base, className)}
			tabIndex={0}
			aria-label={label}
			aria-orientation={orientation}
			aria-valuenow={value}
			aria-valuemin={min}
			aria-valuemax={max ?? Number.MAX_SAFE_INTEGER}
			aria-valuetext={valueText}
			aria-controls={controls}
		/>
	)
}
