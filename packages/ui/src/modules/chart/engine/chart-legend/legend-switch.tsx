'use client'

import { type ReactNode, useRef } from 'react'
import { Button } from '../../../../components/button'
import { Text } from '../../../../components/text'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../../components/tooltip'
import { cn } from '../../../../core/cn'
import { useTruncation } from '../../../../hooks/use-truncation'

/**
 * The row gap of a box that stacks or wraps {@link LegendSwitch} entries, on a
 * coarse pointer. Put it on the box that lays out the entries.
 *
 * @remarks
 * A switch is a `sm` button, 32 px high, and the entries touch, so one row
 * comes 32 px after the row above it. That is less than the 44 pt that a
 * finger needs, and iOS sent a tap on one entry to the entry above or below
 * it. On a coarse pointer, a 12 px gap makes the rows 44 px apart. The touch
 * gap of the box (`TouchTarget`) is the same 12 px, so the hit area of each
 * entry goes half of the gap past each edge. Thus the hit areas are 44 px high
 * and touch, with no space between them. A fine pointer keeps the rows that
 * touch.
 * @internal
 */
export const LEGEND_TOUCH_ROWS =
	'pointer-coarse:gap-y-3 pointer-coarse:[--touch-target-gap-y:--spacing(3)]'

/** Props for {@link LegendSwitch}. @internal */
export type LegendSwitchProps = {
	/** The `data-slot` of the switch, which the roving and the emphasis select. */
	slot: string
	/** The entry is toggled off: the label strikes through and dims. */
	off: boolean
	/** The name of the entry. It truncates to one line. */
	label: string
	/** The keys before the label: the swatch or swatches that mirror the marks. */
	keys: ReactNode
	/** The readout after the label, if any. */
	detail?: ReactNode
	/** Classes of the switch. */
	className?: string
	/** Classes of the box that clips the label. */
	labelClassName?: string
	/** The `data-slot` of the label, if any. */
	labelSlot?: string
	/**
	 * Renders for measurement only, with no reveal tooltip but the same box.
	 * @defaultValue false
	 */
	ghost?: boolean
	/** Toggles the entry. */
	onToggle: () => void
	/** The pointer enters (`true`) or leaves (`false`) the switch. */
	onPoint: (pointed: boolean) => void
	/** Focus enters or leaves the switch. */
	onFocusChange: () => void
}

/**
 * One legend entry: a toggle with its keys, a one-line name, and a readout. The
 * chart legend and the map legend use it.
 *
 * @remarks
 * The switch is no wider than its row, and the name truncates. A narrow rail or
 * row therefore cannot push the entry past its edge. A hover or a keyboard focus
 * shows the full name in a tooltip while the name clips. The tooltip wraps the
 * whole switch rather than the label. A {@link Button}'s touch-target overlay
 * takes the pointer and sends it on by bubbling, so a tooltip on an inner span
 * never sees the hover. The overflow is measured on the label through
 * {@link useTruncation}. A closed tooltip renders no surface, so an entry that
 * fits adds no DOM.
 * @internal
 */
export function LegendSwitch({
	slot,
	off,
	label,
	keys,
	detail,
	className,
	labelClassName,
	labelSlot,
	ghost = false,
	onToggle,
	onPoint,
	onFocusChange,
}: LegendSwitchProps) {
	// The whole switch triggers the tooltip, so its contact, not the label's, arms the measure.
	const switchRef = useRef<HTMLButtonElement>(null)

	const [labelRef, truncated] = useTruncation<HTMLSpanElement>({ armRef: switchRef })

	const control = (
		<Button
			type="button"
			ref={switchRef}
			size="sm"
			variant="plain"
			data-slot={slot}
			// A `Button` does not shrink, so `max-w-full` caps it at the row. A long
			// name then clips and does not overflow the row.
			className={cn('max-w-full', className)}
			aria-pressed={!off}
			// The reveal tooltip echoes the label, which is already in the name of
			// the switch, so its description would repeat the name. The explicit
			// key wins over the description of the trigger.
			aria-describedby={undefined}
			onClick={onToggle}
			// A touch is a tap that toggles the entry, not a point. A tap fires
			// `pointerenter` before its click, and the emphasis dimmed every other
			// mark until the click landed.
			onPointerEnter={(event) => {
				if (event.pointerType !== 'touch') onPoint(true)
			}}
			onPointerLeave={() => onPoint(false)}
			onFocus={onFocusChange}
			onBlur={onFocusChange}
		>
			{keys}

			<span ref={labelRef} className={cn('block min-w-0 truncate text-start', labelClassName)}>
				<Text
					as="span"
					size="sm"
					tone="muted"
					data-slot={labelSlot}
					className={cn('leading-tight', off && 'line-through opacity-60')}
				>
					{label}
				</Text>
			</span>

			{detail}
		</Button>
	)

	// The ghost measures width alone, so it has no reveal tooltip.
	if (ghost) return control

	return (
		<Tooltip disabled={!truncated}>
			<TooltipTrigger>{control}</TooltipTrigger>

			<TooltipContent>{label}</TooltipContent>
		</Tooltip>
	)
}
