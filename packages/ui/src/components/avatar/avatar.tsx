import type { ComponentProps } from 'react'
import { cn } from '../../core'
import { type AvatarVariants, k } from '../../recipes/kata/avatar'
import { capitalizeFirst } from '../../utilities'
import { StatusDot, type StatusDotProps } from '../status'

// The StatusDot union is the single source of truth for status values.
type Status = NonNullable<StatusDotProps['status']>

/** A character that ends a CSS string: a quote, a backslash, or a line break. @internal */
const CSS_STRING_END = /["\\\n\r\f]/g

/** The hex escape of `char`, with the space that ends the escape. @internal */
function hexEscape(char: string): string {
	return `\\${char.charCodeAt(0).toString(16)} `
}

/**
 * The CSS `url()` of `src`, as a quoted string. A quote, a backslash, or a line
 * break in `src` would end the string, so each one takes a hex escape.
 *
 * @internal
 */
function cssUrl(src: string): string {
	return `url("${src.replace(CSS_STRING_END, hexEscape)}")`
}

/** Props for {@link Avatar}; merges recipe variants with image/initials sources and optional status. */
export type AvatarProps = AvatarVariants & {
	/** The URL of the image. It paints as a CSS background over the initials. */
	src?: string | null
	/**
	 * The accessible name of the avatar. An empty `alt` makes the avatar decorative.
	 * @defaultValue ''
	 */
	alt?: string
	/** The text that shows under the image, or alone with no image. It is hidden from assistive tech, so give `alt` too. */
	initials?: string
	/**
	 * The status of a StatusDot on the corner of the avatar. Omit it to show no dot.
	 *
	 * @defaultValue No status: the avatar shows no dot.
	 */
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
 * initials stay out of the accessibility tree. The image is a CSS background
 * layer over the initials, so an image that fails to load paints nothing, and
 * the initials show. A browser leaves out each background in print by
 * default, so the layer asks the browser to print it.
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
			{src && (
				<span
					data-slot="avatar-image"
					className={k.image}
					style={{ backgroundImage: cssUrl(src) }}
				/>
			)}
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
			className={cn(k.status.base, className)}
			{...props}
			// The size of an avatar in a SidebarItem selects the anchor, so it comes
			// after the spread.
			data-slot="avatar-with-status"
		>
			<span data-slot="avatar" className={cn(k({ variant, color }))}>
				{content}
			</span>
			<StatusDot status={status} className={cn(k.status.dot)} />
			{/* Color alone conveys status; the sr-only span names it for assistive technology. */}
			<span className="sr-only">{statusLabel ?? capitalizeFirst(status)}</span>
		</span>
	)
}
