'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { DensityScope, useDensity } from '../../primitives/density'
import { useSkeleton } from '../../providers/skeleton'
import { type AvatarVariants, k } from '../../recipes/kata/avatar'
import { StatusDot, type StatusDotProps } from '../status'
import { AvatarSkeleton } from './avatar-skeleton'

// Derive from the StatusDot union (single source of truth) so the two never drift.
type Status = NonNullable<StatusDotProps['status']>

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

	const resolvedSize = size ?? inherited.size

	if (skeleton) {
		return <AvatarSkeleton size={size} className={className} />
	}

	// With an image present the initials are a purely visual fallback —
	// aria-hide them so the image's alt is the single accessible name.
	const initialsHidden = !!src || !alt

	const content = (
		<>
			{initials && (
				<svg
					className={k.initials}
					viewBox="0 0 100 100"
					aria-hidden={initialsHidden ? 'true' : undefined}
					role="img"
					aria-label={initialsHidden ? undefined : alt}
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
		</>
	)

	if (!status) {
		return (
			<DensityScope scale={size}>
				<span
					data-slot="avatar"
					data-size={resolvedSize}
					className={cn(k({ variant, color, size: resolvedSize }), className)}
					{...props}
				>
					{content}
				</span>
			</DensityScope>
		)
	}

	// `className` and `{...props}` both land on the wrapper so consumer ids,
	// handlers, and classes target one element — clicks on the dot included.
	return (
		<DensityScope scale={size}>
			<span
				data-slot="avatar-with-status"
				className={cn('relative inline-flex', className)}
				{...props}
			>
				<span
					data-slot="avatar"
					data-size={resolvedSize}
					className={cn(k({ variant, color, size: resolvedSize }))}
				>
					{content}
				</span>
				<StatusDot status={status} className={cn('absolute top-0 right-0', k.statusRing)} />
				{/* Status is conveyed by color alone; the sr-only span names it for assistive technology. */}
				<span className="sr-only">
					{statusLabel ?? status.charAt(0).toUpperCase() + status.slice(1)}
				</span>
			</span>
		</DensityScope>
	)
}
