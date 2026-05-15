import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { ConcentricProvider, useResolvedSize } from '../../primitives/concentric'
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
	const skeleton = useSkeleton()

	const resolvedSize = useResolvedSize(size)

	if (skeleton) {
		return (
			<ConcentricProvider value={{ size: resolvedSize }}>
				<Placeholder
					className={cn(kokkaku.avatar.base, kokkaku.avatar.size[resolvedSize], className)}
				/>
			</ConcentricProvider>
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
		return <ConcentricProvider value={{ size: resolvedSize }}>{avatarEl}</ConcentricProvider>
	}

	return (
		<ConcentricProvider value={{ size: resolvedSize }}>
			<span data-slot="avatar-with-status" className={cn('relative inline-flex', className)}>
				{avatarEl}
				<StatusDot status={status} className={cn('absolute top-0 right-0', k.statusRing)} />
			</span>
		</ConcentricProvider>
	)
}
