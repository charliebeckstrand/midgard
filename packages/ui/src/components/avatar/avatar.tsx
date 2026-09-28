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
 * leaf: renders in React Server Components. `size` is explicit and passes
 * through to the StatusDot; compose `<AvatarSkeleton>` in the loading tree.
 * With no `size`, the avatar takes the `md` box at the rank below each density
 * step, so a parent that sizes its avatars with stepped classes, such as
 * SidebarItem, wins over it.
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
	const resolvedSize = size ?? 'md'

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
				data-size={size}
				className={cn(k({ variant, color, size }), className)}
				{...props}
			>
				{content}
			</span>
		)
	}

	// `className` and `{...props}` both land on the wrapper; consumer ids,
	// handlers, and classes target one element, dot included.
	return (
		<span
			data-slot="avatar-with-status"
			className={cn('relative inline-flex', className)}
			{...props}
		>
			<span data-slot="avatar" data-size={size} className={cn(k({ variant, color, size }))}>
				{content}
			</span>
			<StatusDot
				status={status}
				size={resolvedSize}
				className={cn('absolute top-0 right-0', k.statusRing)}
			/>
			{/* Color alone conveys status; the sr-only span names it for assistive technology. */}
			<span className="sr-only">{statusLabel ?? capitalizeFirst(status)}</span>
		</span>
	)
}
