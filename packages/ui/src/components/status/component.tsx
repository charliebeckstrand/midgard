import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { type StatusDotVariants, statusDotVariants } from '../../recipes/kata/status'
import { useAvatarSize } from '../avatar/context'

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
type StatusDotSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

const avatarToStatusSize: Record<AvatarSize, StatusDotSize> = {
	xs: 'xs',
	sm: 'sm',
	md: 'md',
	lg: 'lg',
	xl: 'xl',
}

export type StatusDotProps = StatusDotVariants & {
	className?: string
} & Omit<ComponentPropsWithoutRef<'span'>, 'className'>

export function StatusDot({ variant, status, size, pulse, className, ...props }: StatusDotProps) {
	const avatarSize = useAvatarSize()

	const resolvedSize = size ?? (avatarSize ? avatarToStatusSize[avatarSize] : undefined)

	return (
		<span
			data-slot="status-dot"
			className={cn(statusDotVariants({ variant, status, size: resolvedSize, pulse }), className)}
			{...props}
		/>
	)
}
