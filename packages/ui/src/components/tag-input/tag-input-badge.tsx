'use client'

import { X } from 'lucide-react'
import { cn } from '../../core'
import { useResolvedSize } from '../../primitives/density'
import type { Color } from '../../recipes'
import { k } from '../../recipes/kata/tag-input'
import { Badge, type BadgeProps } from '../badge'
import { Button } from '../button'
import { Icon } from '../icon'

/**
 * Props for {@link TagInputBadge}.
 *
 * @internal
 */
type TagInputBadgeProps = {
	/** Tag text. */
	label: string
	/** Badge color. */
	color: Color
	/** Drops the remove button and removal keys, freezing the chip. */
	disabled?: boolean
	/** Fires when the chip's remove button is clicked or Backspace/Delete is pressed on it. */
	onRemove: () => void
}

/**
 * Single removable tag chip rendered in the {@link TagInput} prefix.
 *
 * @remarks
 * Resolves the host {@link Input}'s stepped-down affix size so the chip sits one
 * notch tighter than the control. The chip is keyboard-focusable and removes on
 * Backspace/Delete; its remove button is held out of the tab order (`tabIndex=-1`)
 * to avoid a redundant stop.
 *
 * @internal
 */
export function TagInputBadge({ label, color, disabled, onRemove }: TagInputBadgeProps) {
	// Badge is a static leaf and reads no context; resolve the host Input's
	// stepped-down affix broadcast (sm → xs, md → sm, lg → md) here and pass
	// it down, keeping the chip one notch tighter than the control.
	const size = useResolvedSize<NonNullable<BadgeProps['size']>>()

	return (
		<Badge
			role="listitem"
			variant="outline"
			rounded="full"
			color={color}
			size={size}
			className={cn(k.badge)}
			suffix={
				!disabled && (
					<Button
						aria-label={`Remove ${label}`}
						variant="bare"
						onMouseDown={(e) => e.preventDefault()}
						tabIndex={-1}
						onClick={(e) => {
							e.stopPropagation()

							onRemove()
						}}
					>
						<Icon icon={<X />} />
					</Button>
				)
			}
			// Disabled badges drop out of the tab order and ignore removal keys;
			// the remove button above is already suppressed.
			tabIndex={disabled ? undefined : 0}
			onKeyDown={(e) => {
				if (disabled) return

				if (e.key === 'Backspace' || e.key === 'Delete') {
					onRemove()
				}
			}}
		>
			<span className="truncate">{label}</span>
		</Badge>
	)
}
