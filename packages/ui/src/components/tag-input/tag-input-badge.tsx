'use client'

import { X } from 'lucide-react'
import type { Color } from '../../recipes'
import { Badge } from '../badge'
import { Button } from '../button'
import { Icon } from '../icon'

export type TagInputBadgeProps = {
	label: string
	color: Color
	disabled?: boolean
	onRemove: () => void
}

export function TagInputBadge({ label, color, disabled, onRemove }: TagInputBadgeProps) {
	return (
		<Badge
			variant="outline"
			rounded="full"
			color={color}
			suffix={
				!disabled && (
					<Button
						aria-label={`Remove ${label}`}
						variant="bare"
						onMouseDown={(e) => e.preventDefault()}
						onClick={(e) => {
							e.stopPropagation()

							onRemove()
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
