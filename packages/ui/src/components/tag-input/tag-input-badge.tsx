'use client'

import { X } from 'lucide-react'
import { cn } from '../../core'
import type { Color } from '../../recipes'
import { k } from '../../recipes/kata/tag-input'
import { Badge } from '../badge'
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
 * The chip sits in the prefix scope of the host {@link Input}, one step below
 * the control, so it takes that step with no `size`. The chip is keyboard-focusable and removes on
 * Backspace/Delete; its remove button is held out of the tab order (`tabIndex=-1`)
 * to avoid a redundant stop.
 *
 * @internal
 */
export function TagInputBadge({ label, color, disabled, onRemove }: TagInputBadgeProps) {
	return (
		<Badge
			role="listitem"
			variant="outline"
			radius="full"
			color={color}
			className={cn(k.badge)}
			suffix={
				!disabled && (
					<Button
						type="button"
						aria-label={`Remove ${label}`}
						variant="bare"
						onMouseDown={(event) => event.preventDefault()}
						tabIndex={-1}
						onClick={(event) => {
							event.stopPropagation()

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
			onKeyDown={(event) => {
				if (disabled) return

				if (event.key === 'Backspace' || event.key === 'Delete') {
					onRemove()
				}
			}}
		>
			<span className="truncate">{label}</span>
		</Badge>
	)
}
