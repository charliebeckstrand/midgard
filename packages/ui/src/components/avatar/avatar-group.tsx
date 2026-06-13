import type { ReactNode } from 'react'
import { cn } from '../../core'
import type { Step } from '../../recipes'
import { k } from '../../recipes/kata/avatar'
import { Avatar } from './avatar'

/** Props for {@link AvatarGroup}; `size` projects onto children and `extra` appends an overflow count avatar. */
export type AvatarGroupProps = {
	size?: Step
	extra?: number
	className?: string
	children: ReactNode
}

/**
 * Overlapping row of avatars. Static leaf: renders in React Server
 * Components. The group projects its `size` onto descendant avatars, so
 * children need no size of their own.
 */
export function AvatarGroup({ extra, size = 'md', className, children }: AvatarGroupProps) {
	return (
		<div
			data-slot="avatar-group"
			className={cn(
				k.group.base,
				k.group.ring,
				k.group.spacing[size],
				k.group.size[size],
				className,
			)}
		>
			{children}
			{extra != null && extra > 0 && (
				<Avatar size={size} initials={`+${extra}`} alt={`${extra} more`} />
			)}
		</div>
	)
}
