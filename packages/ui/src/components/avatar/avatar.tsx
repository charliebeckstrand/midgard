'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { DensityScope, densityPresets, useDensity } from '../../primitives/density'
import { useSkeleton } from '../../providers/skeleton'
import { type AvatarVariants, k } from '../../recipes/kata/avatar'
import { StatusDot } from '../status'
import { AvatarSkeleton } from './avatar-skeleton'

type Status = 'inactive' | 'active' | 'warning' | 'error'

export type AvatarProps = AvatarVariants & {
	src?: string | null
	alt?: string
	initials?: string
	status?: Status
	/** Accessible text for the status dot. Defaults to the humanized `status`. */
	statusLabel?: string
	className?: string
} & Omit<ComponentPropsWithoutRef<'span'>, 'className'>

/** User image, initials, or fallback in a sized circle — pair with `status` to overlay a corner StatusDot. */
export function Avatar({
	src,
	alt = '',
	initials,
	variant,
	color,
	size,
	status,
	statusLabel,
	className,
	...props
}: AvatarProps) {
	const skeleton = useSkeleton()

	const inherited = useDensity()

	const token = size ? densityPresets[size] : inherited

	const resolvedSize = token.size

	if (skeleton) {
		return <AvatarSkeleton size={size} className={className} />
	}

	const avatarEl = (
		<span
			data-slot="avatar"
			data-size={resolvedSize}
			className={cn(k({ variant, color, size: resolvedSize }), !status && className)}
			{...props}
		>
			{initials && (
				<svg
					className={k.initials}
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
			{src && <img className={k.image} src={src} alt={alt} />}
		</span>
	)

	if (!status) {
		return <DensityScope scale={size}>{avatarEl}</DensityScope>
	}

	return (
		<DensityScope scale={size}>
			<span data-slot="avatar-with-status" className={cn('relative inline-flex', className)}>
				{avatarEl}
				<StatusDot status={status} className={cn('absolute top-0 right-0', k.statusRing)} />
				{/* Status is conveyed by color alone; the sr-only span names it for assistive technology. */}
				<span className="sr-only">
					{statusLabel ?? status.charAt(0).toUpperCase() + status.slice(1)}
				</span>
			</span>
		</DensityScope>
	)
}
