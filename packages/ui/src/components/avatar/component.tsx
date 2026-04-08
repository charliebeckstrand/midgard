import { createContext, use } from 'react'
import { cn } from '../../core'
import type { take } from '../../recipes/take'
import { StatusDot } from '../status'
import {
	type AvatarVariants,
	avatarImageVariants,
	avatarInitialsVariants,
	avatarVariants,
} from './variants'

type AvatarSize = take.AvatarSize

// ── AvatarGroup ─────────────────────────────────────

const AvatarGroupSizeContext = createContext<AvatarSize | null>(null)

const sizeMap: Record<AvatarSize, string> = {
	xs: '-space-x-1',
	sm: '-space-x-1.5',
	md: '-space-x-2',
	lg: '-space-x-2.5',
	xl: '-space-x-3',
}

export type AvatarGroupProps = {
	size?: AvatarSize
	extra?: number
	className?: string
	children: React.ReactNode
}

export function AvatarGroup({ extra, size = 'sm', className, children }: AvatarGroupProps) {
	return (
		<AvatarGroupSizeContext value={size}>
			<div
				data-slot="avatar-group"
				className={cn(
					'flex items-center *:ring-2 *:ring-white dark:*:ring-zinc-900',
					sizeMap[size],
					className,
				)}
			>
				{children}
				{extra != null && extra > 0 && <Avatar size={size} initials={`+${extra}`} />}
			</div>
		</AvatarGroupSizeContext>
	)
}

// ── Avatar ──────────────────────────────────────────

type Status = 'inactive' | 'active' | 'warning' | 'error'

import { AvatarSizeContext } from './context'

export { AvatarSizeContext }

export type AvatarProps = AvatarVariants & {
	src?: string | null
	alt?: string
	initials?: string
	status?: Status
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'span'>, 'className'>

export function Avatar({
	src,
	alt = '',
	initials,
	variant,
	color,
	size,
	status,
	className,
	...props
}: AvatarProps) {
	const groupSize = use(AvatarGroupSizeContext)

	const resolvedSize = size ?? groupSize ?? 'sm'

	const avatarEl = (
		<span
			data-slot="avatar"
			className={cn(avatarVariants({ variant, color, size: resolvedSize }), !status && className)}
			{...props}
		>
			{initials && (
				<svg
					className={avatarInitialsVariants()}
					viewBox="0 0 100 100"
					aria-hidden={alt ? undefined : 'true'}
					role="img"
					aria-label={alt || undefined}
				>
					<text
						x="50%"
						y="50%"
						alignmentBaseline="middle"
						dominantBaseline="middle"
						textAnchor="middle"
						dy=".125em"
					>
						{initials}
					</text>
				</svg>
			)}
			{src && <img className={avatarImageVariants()} src={src} alt={alt} />}
		</span>
	)

	if (!status) {
		return <AvatarSizeContext value={resolvedSize}>{avatarEl}</AvatarSizeContext>
	}

	return (
		<AvatarSizeContext value={resolvedSize}>
			<span data-slot="avatar-with-status" className={cn('relative inline-flex', className)}>
				{avatarEl}
				<StatusDot
					status={status}
					className="absolute top-0 right-0 ring-2 ring-white dark:ring-zinc-900"
				/>
			</span>
		</AvatarSizeContext>
	)
}
