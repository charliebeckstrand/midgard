'use client'

import { type CSSProperties, cloneElement, type ReactElement } from 'react'
import { cn } from '../../core'
import { useResolvedSize } from '../../primitives/density'
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

/** Sizing and accessibility wrapper that clones a Lucide-style `icon` element. `size` resolves from the prop or ambient Density, and a `label` exposes it as `role="img"` instead of hiding it. */
export function Icon({ icon, size, className, label }: IconProps) {
	// `k.size` tops out at `lg` (no `xl` step). `useResolvedSize` can carry `'xl'`
	// (Button broadcasts up to `Ma`); when that reaches an Icon with no explicit
	// size, the `k.size` lookup misses and the icon falls back to its inherited
	// dimensions. The type narrowing makes the missing-key branch explicit.
	const ambient = useResolvedSize() as Size

	const resolvedSize = size ?? ambient

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
