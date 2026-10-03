'use client'

import { X } from 'lucide-react'
import { cn } from '../../core'
import type { Color } from '../../recipes'
import { k as badgeKata } from '../../recipes/kata/badge'
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
 * the control, so it takes that step with no `size`. The remove button is the
 * one Tab stop of the chip. It has the name "Remove <tag>", and it removes the
 * tag on a click, Enter, Space, Backspace, or Delete. A disabled chip has no
 * remove button and no Tab stop.
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
			className={cn(k.badge, badgeKata.removable)}
			suffix={
				!disabled && (
					<Button
						type="button"
						aria-label={`Remove ${label}`}
						variant="bare"
						onMouseDown={(event) => event.preventDefault()}
						onClick={(event) => {
							event.stopPropagation()

							onRemove()
						}}
						onKeyDown={(event) => {
							if (event.key === 'Backspace' || event.key === 'Delete') {
								onRemove()
							}
						}}
					>
						<Icon icon={<X />} />
					</Button>
				)
			}
		>
			<span className="truncate">{label}</span>
		</Badge>
	)
}
