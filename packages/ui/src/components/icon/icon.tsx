'use client'

import { cloneElement, type ReactElement } from 'react'
import { cn } from '../../core'
import { useResolvedSize } from '../../primitives/concentric'
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
	const ambient = useResolvedSize<Size>()

	const resolvedSize = size ?? ambient

	const isNumeric = typeof resolvedSize === 'number'

	return cloneElement(icon as ReactElement<Record<string, unknown>>, {
		'aria-hidden': 'true',
		'data-slot': 'icon',
		className: cn(!isNumeric && sizeMap[resolvedSize], className),
		...(isNumeric && { style: { width: resolvedSize, height: resolvedSize } }),
	})
}
