'use client'

import { cloneElement, type ReactElement } from 'react'
import { cn } from '../../core'
import { useSize } from '../../primitives/density'
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

export function Icon({ icon, size, className, label }: IconProps) {
	// Icon's scale tops out at `lg` — `k.size` doesn't have an `xl` step.
	// `useSize` can carry `'xl'` (Button broadcasts up to `Ma`), so when
	// that reaches an Icon with no explicit size, the `k.size` lookup misses
	// and the icon falls back to its inherited dimensions. Make the type
	// narrowing explicit so the missing-key branch reads as intentional.
	const ambient = useSize() as Size

	const resolvedSize = size ?? ambient

	const isNumeric = typeof resolvedSize === 'number'

	return cloneElement(icon as ReactElement<Record<string, unknown>>, {
		...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': 'true' }),
		'data-slot': 'icon',
		className: cn('shrink-0', !isNumeric && k.size[resolvedSize], className),
		...(isNumeric && { style: { width: resolvedSize, height: resolvedSize } }),
	})
}
