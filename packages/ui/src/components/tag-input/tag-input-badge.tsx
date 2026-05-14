'use client'

import { X } from 'lucide-react'
import type { Color } from '../../recipes/ryu/iro'
import { Badge } from '../badge'
import { Button } from '../button'
import { Icon } from '../icon'
import { tagRemoveSize, tagSize } from './tag-input-utilities'

export type TagInputBadgeProps = {
	label: string
	size: 'sm' | 'md' | 'lg'
	color: Color
	disabled?: boolean
	onRemove: () => void
}

export function TagInputBadge({ label, size, color, disabled, onRemove }: TagInputBadgeProps) {
	return (
		<Badge
			size={tagSize[size]}
			variant="outline"
			rounded="full"
			color={color}
			suffix={
				!disabled && (
					<Button
						aria-label={`Remove ${label}`}
						className={tagRemoveSize[size]}
						size="xs"
						variant="plain"
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
