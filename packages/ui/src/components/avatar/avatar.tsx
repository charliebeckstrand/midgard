import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { kokkaku } from '../../recipes'
import {
	type AvatarVariants,
	avatarImageVariants,
	avatarInitialsVariants,
	avatarVariants,
	k,
} from '../../recipes/kata/avatar'
import { Placeholder } from '../placeholder'
import { useSkeleton } from '../skeleton/context'
import { StatusDot } from '../status'
import { AvatarSizeProvider, useAvatarGroupSize } from './context'

type Status = 'inactive' | 'active' | 'warning' | 'error'

export type AvatarProps = AvatarVariants & {
	src?: string | null
	alt?: string
	initials?: string
	status?: Status
	className?: string
} & Omit<ComponentPropsWithoutRef<'span'>, 'className'>

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
	const groupSize = useAvatarGroupSize()
	const skeleton = useSkeleton()

	const resolvedSize = size ?? groupSize ?? 'md'

	if (skeleton) {
		return (
			<AvatarSizeProvider value={resolvedSize}>
				<Placeholder
					className={cn(kokkaku.avatar.base, kokkaku.avatar.size[resolvedSize], className)}
				/>
			</AvatarSizeProvider>
		)
	}

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
		return <AvatarSizeProvider value={resolvedSize}>{avatarEl}</AvatarSizeProvider>
	}

	return (
		<AvatarSizeProvider value={resolvedSize}>
			<span data-slot="avatar-with-status" className={cn('relative inline-flex', className)}>
				{avatarEl}
				<StatusDot status={status} className={cn('absolute top-0 right-0', k.statusRing)} />
			</span>
		</AvatarSizeProvider>
	)
}
