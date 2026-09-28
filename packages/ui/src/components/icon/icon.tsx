import { type CSSProperties, cloneElement, type ReactElement } from 'react'
import { cn } from '../../core'
import { type IconSize, k } from '../../recipes/kata/icon'

/** Props for {@link Icon}: the `icon` element to clone, plus `size` and an optional accessible `label`. */
export type IconProps = {
	/**
	 * The element to clone. Its component must forward unknown props to the element
	 * it renders, because `className` and `data-slot` are injected here. A wrapper
	 * component that declares no props swallows both, and the glyph falls back to
	 * its library's own size.
	 */
	icon: ReactElement
	/**
	 * Named scale step or a raw pixel value. Omit it to follow the nearest
	 * density scope, and `md` outside one. A named step makes the icon its own
	 * scope. A host can project an icon size, as Button, Badge, Sidebar, Nav,
	 * and the menu and option rows do. Inside such a host, the `data-slot=icon`
	 * projection sets the size, and it can override this. A control affix slot
	 * projects no size: it is a scope one step below its control, so an icon
	 * with no `size` takes that step.
	 */
	size?: IconSize | number
	className?: string
	/**
	 * Accessible name for a meaningful icon. When set, the icon is exposed to
	 * assistive technology as `role="img"` with this label instead of being
	 * hidden. Omit for decorative icons (the default), which stay `aria-hidden`.
	 */
	label?: string
}

/**
 * Sizing and accessibility wrapper that clones a Lucide-style `icon` element (which must
 * forward the props cloned onto it — see {@link IconProps.icon}).
 *
 * @remarks
 * Static leaf: renders in React Server Components. A `label` exposes the icon
 * as `role="img"` with that accessible name; without one the icon is
 * decorative and stays `aria-hidden`.
 */
export function Icon({ icon, size, className, label }: IconProps) {
	const isNumeric = typeof size === 'number'

	return cloneElement(icon as ReactElement<Record<string, unknown>>, {
		...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': 'true' }),
		'data-slot': 'icon',
		'data-density': isNumeric ? undefined : size,
		className: cn(
			'shrink-0',
			!isNumeric && k.ramp,
			(icon.props as { className?: string }).className,
			className,
		),
		...(isNumeric && {
			style: {
				...(icon.props as { style?: CSSProperties }).style,
				width: size,
				height: size,
			},
		}),
	})
}
