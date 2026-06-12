import { type CSSProperties, cloneElement, type ReactElement } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/icon'
import type { Size } from '../../types/size'

export type IconProps = {
	icon: ReactElement
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
 * Static leaf: renders in React Server Components. `size` is explicit with a
 * default of `md`; inside a sized host (Button, Badge, Sidebar, control affix
 * slots) the host's `data-slot=icon` projection owns the size and overrides
 * these classes. A `label` exposes the icon as `role="img"` instead of hiding
 * it.
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
