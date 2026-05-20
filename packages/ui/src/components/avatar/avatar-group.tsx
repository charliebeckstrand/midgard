import type { ReactNode } from 'react'
import { cn } from '../../core'
import { DensityScope } from '../../primitives/density'
import { group } from '../../recipes/kata/avatar'
import type { Step } from '../../recipes/ryu/sun'
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
				className={cn(group.base, group.ring, group.spacing[size], className)}
			>
				{children}
				{extra != null && extra > 0 && <Avatar size={size} initials={`+${extra}`} />}
			</div>
		</DensityScope>
	)
}
