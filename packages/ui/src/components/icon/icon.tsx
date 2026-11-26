import type { LucideIcon } from 'lucide-react'
import { type CSSProperties, cloneElement, isValidElement, type ReactElement } from 'react'
import { cn } from '../../core/cn'
import type { ScaleStep } from '../../core/density/scale'
import { Glyph } from '../../primitives/glyph'
import { k, mirror as mirrorClass, type scale } from '../../recipes/kata/icon'

/** Props for {@link Icon}: the `icon` to draw, plus `size` and an optional accessible `label`. */
export type IconProps = {
	/**
	 * A Lucide icon, such as `X` from `lucide-react`, or an element to clone. A
	 * Lucide icon draws through `Glyph`, so the icon that `<UIProvider icons>`
	 * registers for its name replaces it.
	 *
	 * The component of an element must forward unknown props to the element
	 * that it renders, because `className` and `data-slot` are injected here. A
	 * wrapper component that declares no props swallows both, and the glyph
	 * falls back to its library's own size.
	 */
	icon: LucideIcon | ReactElement
	/**
	 * A density step, or a size in pixels. Omit it to take the step of the
	 * nearest density scope. A step makes the icon a density scope.
	 *
	 * A host can project an icon size, as Button, Badge, Nav, and the menu and
	 * option rows do. Inside such a host, the `data-slot=icon` projection sets
	 * the size, and it can override a step. A control affix slot projects no
	 * size: it is a scope one step below its control, so an icon with no `size`
	 * takes that step.
	 *
	 * A pixel size is the exception. It is an explicit override from the
	 * caller, and it goes on the icon as inline `width` and `height`. The inline
	 * style wins over a host projection, so no host can override a pixel size.
	 */
	size?: ScaleStep<typeof scale> | number
	/**
	 * Mirrors the icon in a right-to-left layout. Set it on a glyph that points
	 * along the line, such as a chevron or an arrow for next and previous.
	 * @defaultValue false
	 */
	mirror?: boolean
	className?: string
	/**
	 * Accessible name for a meaningful icon. When set, the icon is exposed to
	 * assistive technology as `role="img"` with this label instead of being
	 * hidden. Omit for decorative icons (the default), which stay `aria-hidden`.
	 */
	label?: string
}

/**
 * A wrapper that sizes an icon and makes it accessible. It draws a Lucide
 * `icon` through `Glyph`, or clones an `icon` element. The element must
 * forward the props cloned onto it (see {@link IconProps.icon}).
 *
 * @remarks
 * Static leaf: renders in React Server Components. A `label` exposes the icon
 * as `role="img"` with that accessible name; without one the icon is
 * decorative and stays `aria-hidden`.
 */
export function Icon({ icon, size, mirror = false, className, label }: IconProps) {
	const numeric = typeof size === 'number'

	const a11yProps = label
		? { role: 'img', 'aria-label': label, 'aria-hidden': undefined }
		: { 'aria-hidden': 'true' }

	const element = isValidElement(icon) ? icon : <Glyph icon={icon} />

	return cloneElement(element as ReactElement<Record<string, unknown>>, {
		...a11yProps,
		'data-slot': 'icon',
		'data-density': numeric ? undefined : size,
		className: cn(
			'shrink-0',
			!numeric && k().base,
			mirror && mirrorClass,
			(element.props as { className?: string }).className,
			className,
		),
		...(numeric && {
			style: {
				...(element.props as { style?: CSSProperties }).style,
				width: size,
				height: size,
			},
		}),
	})
}
