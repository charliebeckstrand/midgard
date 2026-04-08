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

export function StatusDot({ status, size, className, ...props }: StatusDotProps) {
	const avatarSize = use(AvatarSizeContext)

	const resolvedSize = size ?? (avatarSize ? avatarToStatusSize[avatarSize] : undefined)

	return (
		<span
			data-slot="status-dot"
			className={cn(statusDotVariants({ status, size: resolvedSize }), className)}
			{...props}
		/>
	)
}
