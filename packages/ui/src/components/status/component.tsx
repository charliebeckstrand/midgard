'use client'

import { use } from 'react'
import { cn } from '../../core'
import { AvatarSizeContext } from '../avatar/context'
import { type StatusDotVariants, statusDotVariants } from './variants'

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
} & Omit<React.ComponentPropsWithoutRef<'span'>, 'className'>

export function StatusDot({ variant, status, size, pulse, className, ...props }: StatusDotProps) {
	const avatarSize = use(AvatarSizeContext)

	const resolvedSize = size ?? (avatarSize ? avatarToStatusSize[avatarSize] : undefined)

	return (
		<span
			data-slot="status-dot"
			className={cn(statusDotVariants({ variant, status, size: resolvedSize, pulse }), className)}
			{...props}
		/>
	)
}
