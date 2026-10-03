import type { ComponentProps } from 'react'
import { cn } from '../../core'
import { type AvatarVariants, k } from '../../recipes/kata/avatar'
import { capitalizeFirst } from '../../utilities'
import { StatusDot, type StatusDotProps } from '../status'

// The StatusDot union is the single source of truth for status values.
type Status = NonNullable<StatusDotProps['status']>

/** Props for {@link Avatar}; merges recipe variants with image/initials sources and optional status. */
export type AvatarProps = AvatarVariants & {
	src?: string | null
	alt?: string
	initials?: string
	status?: Status
	/** Accessible text for the status dot. Defaults to the humanized `status`. */
	statusLabel?: string
	className?: string
} & Omit<ComponentProps<'span'>, 'className'>

/**
 * User image, initials, or fallback in a sized circle. Pair with `status` to
 * overlay a corner StatusDot. With no `src` and no `initials`, the circle is
 * empty, and an inner `role="img"` node carries `alt` as its name. Static
 * leaf: renders in React Server Components. Compose `<AvatarSkeleton>` in the
 * loading tree.
 *
 * @remarks
 * Without `size`, the avatar takes the step of the nearest density scope. An
 * explicit `size` makes the avatar a density scope, so the StatusDot takes the
 * step of the avatar. A parent can size its avatars with more specific stepped
 * classes, as SidebarItem does.
 */
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
	// With an image present the initials are a visual fallback; aria-hidden
	// leaves the image's alt as the single accessible name.
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
			{/* With no source, this node carries `alt`, as the svg and the img do. */}
			{!src && !initials && (
				<span role="img" aria-label={alt || undefined} aria-hidden={alt ? undefined : 'true'} />
			)}
		</>
	)

	if (!status) {
		return (
			<span
				data-slot="avatar"
				data-density={size}
				className={cn(k({ variant, color }), className)}
				{...props}
			>
				{content}
			</span>
		)
	}

	// `className` and `{...props}` both land on the wrapper; consumer ids,
	// handlers, and classes target one element, dot included. The wrapper fits
	// the circle, so a stretching flex or grid parent cannot widen it and move
	// the dot off the circle.
	return (
		<span
			data-slot="avatar-with-status"
			data-density={size}
			className={cn('relative inline-flex size-fit', className)}
			{...props}
		>
			<span data-slot="avatar" className={cn(k({ variant, color }))}>
				{content}
			</span>
			<StatusDot status={status} className={cn('absolute top-0 right-0', k.statusRing)} />
			{/* Color alone conveys status; the sr-only span names it for assistive technology. */}
			<span className="sr-only">{statusLabel ?? capitalizeFirst(status)}</span>
		</span>
	)
}
