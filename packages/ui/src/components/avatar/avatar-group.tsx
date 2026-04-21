import { cn } from '../../core'
import type { take } from '../../recipes/take'
import { Avatar } from './avatar'
import { AvatarGroupSizeContext } from './context'
import { k } from './variants'

type AvatarSize = take.AvatarSize

export type AvatarGroupProps = {
	size?: AvatarSize
	extra?: number
	className?: string
	children: React.ReactNode
}

export function AvatarGroup({ extra, size = 'md', className, children }: AvatarGroupProps) {
	return (
		<AvatarGroupSizeContext value={size}>
			<div
				data-slot="avatar-group"
				className={cn(k.groupBase, k.groupRing, k.groupSpacing[size], className)}
			>
				{children}
				{extra != null && extra > 0 && <Avatar size={size} initials={`+${extra}`} />}
			</div>
		</AvatarGroupSizeContext>
	)
}
