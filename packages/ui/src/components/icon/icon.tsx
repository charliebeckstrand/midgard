'use client'

import { cloneElement, type ReactElement } from 'react'
import { cn } from '../../core'
import { useWideSize } from '../../primitives/density'
import type { Size } from '../../types/size'

export type IconProps = {
	icon: ReactElement
	size?: Size | number
	className?: string
}

const sizeMap: Record<Size, string> = {
	xs: 'size-3',
	sm: 'size-4',
	md: 'size-5',
	lg: 'size-6',
}

export function Icon({ icon, size, className }: IconProps) {
	// Icon's scale tops out at `lg` — `take.icon` doesn't have an `xl` step.
	// `useWideSize` can carry `'xl'` (Button broadcasts up to `Ma`), so when
	// that reaches an Icon with no explicit size, `sizeMap` lookup misses
	// and the icon falls back to its inherited dimensions. Make the type
	// narrowing explicit so the missing-key branch reads as intentional.
	const ambient = useWideSize() as Size

	const resolvedSize = size ?? ambient

	const isNumeric = typeof resolvedSize === 'number'

	return cloneElement(icon as ReactElement<Record<string, unknown>>, {
		'aria-hidden': 'true',
		'data-slot': 'icon',
		className: cn(!isNumeric && sizeMap[resolvedSize], className),
		...(isNumeric && { style: { width: resolvedSize, height: resolvedSize } }),
	})
}
