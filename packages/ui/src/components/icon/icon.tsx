'use client'

import { cloneElement, type ReactElement } from 'react'
import { cn } from '../../core'
import { useButtonSize } from '../button/context'
import { useInputSize } from '../input/context'

type SizeToken = 'xs' | 'sm' | 'md' | 'lg'

export type IconProps = {
	icon: ReactElement
	size?: SizeToken | number
	className?: string
}

const sizeMap: Record<SizeToken, string> = {
	xs: 'size-3',
	sm: 'size-4',
	md: 'size-5',
	lg: 'size-6',
}

export function Icon({ icon, size, className }: IconProps) {
	const buttonSize = useButtonSize()
	const inputSize = useInputSize()

	const resolvedSize = size ?? buttonSize ?? inputSize ?? 'md'

	const isNumeric = typeof resolvedSize === 'number'

	return cloneElement(icon as ReactElement<Record<string, unknown>>, {
		'aria-hidden': 'true',
		'data-slot': 'icon',
		className: cn(!isNumeric && sizeMap[resolvedSize], className),
		...(isNumeric && { style: { width: resolvedSize, height: resolvedSize } }),
	})
}
