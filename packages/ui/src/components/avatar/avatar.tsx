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
	/**
	 * The accessible name of the avatar. An empty `alt` makes the avatar decorative.
	 * @defaultValue ''
	 */
	alt?: string
	initials?: string
	status?: Status
	/** Accessible text for the status dot. Defaults to the humanized `status`. */
	statusLabel?: string
	className?: string
} & Omit<ComponentProps<'span'>, 'className' | 'children'>

/**
 * User image, initials, or fallback in a sized circle. Pair with `status` to
 * overlay a corner StatusDot. Static leaf: renders in React Server Components.
 * Compose `<AvatarSkeleton>` in the loading tree.
 *
 * @remarks
 * An inner `role="img"` node carries `alt` as the name, so the image and the
 * initials stay out of the accessibility tree. The image takes an empty `alt`,
 * so an image that fails to load draws no alt text over the initials. Chromium
 * still draws its small broken-image icon in the corner of the image.
 *
 * The initials also show through the clear areas of an image. Give no
 * `initials` with an image that has clear areas, such as a logo.
 *
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
	const content = (
		<>
			{alt && <span role="img" aria-label={alt} />}
			{initials && (
				<svg className={k.initials} viewBox="0 0 100 100" aria-hidden="true">
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
			{src && <img className={k.image} src={src} alt="" />}
		</>
	)

	if (!status) {
		return (
			<span
				data-density={size}
				className={cn(k({ variant, color }), className)}
				{...props}
				// The ring of AvatarGroup selects the anchor, so it comes after the spread.
				data-slot="avatar"
			>
				{content}
			</span>
		)
	}

	// `className` and `{...props}` both land on the wrapper; consumer ids,
	// handlers, and classes target one element, dot included.
	return (
		<span
			data-density={size}
			className={cn(k.withStatus, className)}
			{...props}
			// The size of an avatar in a SidebarItem selects the anchor, so it comes
			// after the spread.
			data-slot="avatar-with-status"
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
