import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../core'
import { type AvatarVariants, k } from '../../recipes/kata/avatar'

/**
 * Props for {@link AvatarGroup}: `<div>` attributes, and `size`, the density step
 * of the avatars and their status dots.
 */
export type AvatarGroupProps = Omit<ComponentProps<'div'>, 'className' | 'children'> & {
	/**
	 * The size of each avatar. The group writes it as a density scope. Without
	 * it, the avatars take the step of the nearest density scope.
	 */
	size?: AvatarVariants['size']
	className?: string
	children: ReactNode
}

/**
 * Overlapping row of avatars. Static leaf: renders in React Server
 * Components. The group is the density scope of its avatars and their status
 * dots, so children need no size of their own. The ring lands on each
 * avatar circle, also inside a with-status wrapper. Append an overflow count as a final
 * `<Avatar initials="+N" alt="N more" />` child. To name the group, give it
 * `role="group"` and an `aria-label`.
 */
export function AvatarGroup({ size, className, children, ...props }: AvatarGroupProps) {
	return (
		<div
			data-slot="avatar-group"
			data-density={size}
			className={cn(k.group.base, k.group.ring, k.group.spacing, className)}
			{...props}
		>
			{children}
		</div>
	)
}
