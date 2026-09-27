'use client'

import { type ReactNode, type RefObject, useRef, useState } from 'react'
import { Button } from '../../../../components/button'
import { Text } from '../../../../components/text'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../../components/tooltip'
import { cn } from '../../../../core'
import { useStableEvent } from '../../../../hooks/use-stable-event'
import { useTruncation } from '../../../../hooks/use-truncation'

/** The emphasis handlers that {@link useLegendEmphasis} gives each switch. @internal */
export type LegendEmphasis<Key> = {
	/** The pointer enters (`key`) or leaves (`null`) a switch. */
	point: (key: Key | null) => void
	/** Focus enters or leaves a switch. The emphasis reads the focused switch again. */
	sync: () => void
}

/**
 * The emphasis of a legend, which the pointer and the keyboard share.
 *
 * @remarks
 * The switch under the pointer wins. Else the switch with `:focus-visible`
 * wins, the same gate as the focus ring. The keyboard side reads the DOM, not a
 * tracked index. Thus a focus that stops being visible emphasizes nothing, with
 * no event to announce it. Examples are the focus of a click, or of a tab that
 * comes back. When the pointer leaves, the emphasis goes back to a switch that
 * keeps the keyboard focus. The handlers keep their identity.
 *
 * @param containerRef - The legend.
 * @param selector - The switches inside the legend, in render order.
 * @param keyAt - The key of the switch at a position, or `null` for no emphasis.
 * @param onEmphasis - Receives the emphasized key, or `null`.
 * @returns The handlers of each switch.
 * @internal
 */
export function useLegendEmphasis<Key>(
	containerRef: RefObject<HTMLElement | null>,
	selector: string,
	keyAt: (position: number) => Key | null,
	onEmphasis: (key: Key | null) => void,
): LegendEmphasis<Key> {
	const pointed = useRef<Key | null>(null)

	const sync = useStableEvent(() => {
		if (pointed.current !== null) {
			onEmphasis(pointed.current)

			return
		}

		const switches = containerRef.current?.querySelectorAll<HTMLElement>(selector)

		const position = switches
			? Array.from(switches).findIndex((element) => element.matches(':focus-visible'))
			: -1

		onEmphasis(position === -1 ? null : keyAt(position))
	})

	const point = useStableEvent((key: Key | null) => {
		pointed.current = key

		sync()
	})

	const [handlers] = useState(() => ({ point, sync }))

	return handlers
}

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
 * The name truncates, so a narrow rail cannot push the row past its edge. A
 * hover or a keyboard focus shows the full name in a tooltip while the name
 * clips. The tooltip wraps the whole switch rather than the label. A
 * {@link Button}'s touch-target overlay takes the pointer and sends it on by
 * bubbling, so a tooltip on an inner span never sees the hover. The overflow
 * is measured on the label through {@link useTruncation}. A closed tooltip
 * renders no surface, so an entry that fits adds no DOM.
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
			className={className}
			aria-pressed={!off}
			onClick={onToggle}
			onPointerEnter={() => onPoint(true)}
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
