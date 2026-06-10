'use client'

import { X } from 'lucide-react'
import { cn } from '../../core'
import type { Color } from '../../recipes'
import { k } from '../../recipes/kata/tag-input'
import { Badge } from '../badge'
import { Button } from '../button'
import { Icon } from '../icon'

type TagInputBadgeProps = {
	label: string
	color: Color
	disabled?: boolean
	onRemove: () => void
}

export function TagInputBadge({ label, color, disabled, onRemove }: TagInputBadgeProps) {
	return (
		<Badge
			role="listitem"
			variant="outline"
			rounded="full"
			color={color}
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
