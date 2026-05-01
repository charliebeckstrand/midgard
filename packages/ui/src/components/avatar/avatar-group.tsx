import type { ReactNode } from 'react'
import { cn } from '../../core'
import type { take } from '../../recipes/ryu/take'
import { Avatar } from './avatar'
import { AvatarGroupSizeContext } from './context'
import { k } from './variants'

type AvatarSize = take.AvatarSize

export type AvatarGroupProps = {
	size?: AvatarSize
	extra?: number
	className?: string
	children: ReactNode
}

export function AvatarGroup({ extra, size = 'md', className, children }: AvatarGroupProps) {
	return (
		<AvatarGroupSizeContext value={size}>
			<div
				data-slot="avatar-group"
				className={cn(k.group.base, k.group.ring, k.group.spacing[size], className)}
			>
				{children}
				{extra != null && extra > 0 && <Avatar size={size} initials={`+${extra}`} />}
			</div>
		</AvatarGroupSizeContext>
	)
}
