import type { ReactNode } from 'react'
import { cn } from '../../core'
import { DensityScope } from '../../primitives/density'
import type { Step } from '../../recipes'
import { k } from '../../recipes/kata/avatar'
import { Avatar } from './avatar'

export type AvatarGroupProps = {
	size?: Step
	extra?: number
	className?: string
	children: ReactNode
}

export function AvatarGroup({ extra, size = 'md', className, children }: AvatarGroupProps) {
	return (
		<DensityScope scale={size}>
			<div
				data-slot="avatar-group"
				className={cn(k.group.base, k.group.ring, k.group.spacing[size], className)}
			>
				{children}
				{extra != null && extra > 0 && <Avatar size={size} initials={`+${extra}`} />}
			</div>
		</DensityScope>
	)
}
