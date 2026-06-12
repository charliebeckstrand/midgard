'use client'

import { X } from 'lucide-react'
import { cn } from '../../core'
import { useResolvedSize } from '../../primitives/density'
import type { Color } from '../../recipes'
import { k } from '../../recipes/kata/tag-input'
import { Badge, type BadgeProps } from '../badge'
import { Button } from '../button'
import { Icon } from '../icon'

type TagInputBadgeProps = {
	label: string
	color: Color
	disabled?: boolean
	onRemove: () => void
}

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
