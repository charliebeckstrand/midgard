import type { ReactNode } from 'react'
import { cn } from '../../core'
import type { Step } from '../../recipes'
import { k } from '../../recipes/kata/avatar'

/** Props for {@link AvatarGroup}; `size` projects onto descendant avatars. */
export type AvatarGroupProps = {
	size?: Step
	className?: string
	children: ReactNode
}

/**
 * Overlapping row of avatars. Static leaf: renders in React Server
 * Components. The group projects its `size` onto descendant avatars, so
 * children need no size of their own. Append an overflow count as a final
 * `<Avatar initials="+N" alt="N more" />` child.
 */
export function AvatarGroup({ size = 'md', className, children }: AvatarGroupProps) {
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
		</div>
	)
}
