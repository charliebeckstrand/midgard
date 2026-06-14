import { type CSSProperties, cloneElement, type ReactElement } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/icon'
import type { Size } from '../../types/size'

/** Props for {@link Icon}: the `icon` element to clone, plus `size` and an optional accessible `label`. */
export type IconProps = {
	icon: ReactElement
	/**
	 * Named scale step or a raw pixel value. Inside a sized host (Button, Badge,
	 * Sidebar, control affix slots) the host's `data-slot=icon` projection owns
	 * the size and overrides this.
	 * @defaultValue `'md'`
	 */
	size?: Size | number
	className?: string
	/**
	 * Accessible name for a meaningful icon. When set, the icon is exposed to
	 * assistive technology as `role="img"` with this label instead of being
	 * hidden. Omit for decorative icons (the default), which stay `aria-hidden`.
	 */
	label?: string
}

/**
 * Sizing and accessibility wrapper that clones a Lucide-style `icon` element.
 *
 * @remarks
 * Static leaf: renders in React Server Components. A `label` exposes the icon
 * as `role="img"` with that accessible name; without one the icon is
 * decorative and stays `aria-hidden`.
 */
export function Icon({ icon, size, className, label }: IconProps) {
	const resolvedSize = size ?? 'md'

	const isNumeric = typeof resolvedSize === 'number'

	return cloneElement(icon as ReactElement<Record<string, unknown>>, {
		...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': 'true' }),
		'data-slot': 'icon',
		className: cn(
			'shrink-0',
			!isNumeric && k.size[resolvedSize],
			(icon.props as { className?: string }).className,
			className,
		),
		...(isNumeric && {
			style: {
				...(icon.props as { style?: CSSProperties }).style,
				width: resolvedSize,
				height: resolvedSize,
			},
		}),
	})
}
