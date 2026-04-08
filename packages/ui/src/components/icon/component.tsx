'use client'

import { cn } from '../../core'
import { useButtonSize } from '../button/context'
import { useInputSize } from '../input/context'
import { type IconName, iconData } from './icon-data'

export type { IconName }

type SizeToken = 'xs' | 'sm' | 'md' | 'lg'

type IconProps = React.SVGProps<SVGSVGElement> & {
	name: IconName
	size?: SizeToken | number
	className?: string
}

const sizeMap: Record<SizeToken, string> = {
	xs: 'size-3',
	sm: 'size-4',
	md: 'size-5',
	lg: 'size-6',
}

export type { IconProps }

export function Icon({ name, size, className, style, ...props }: IconProps) {
	const buttonSize = useButtonSize()
	const inputSize = useInputSize()

	const resolvedSize = size ?? buttonSize ?? inputSize ?? 'md'

	const icon = iconData[name]

	const isNumeric = typeof resolvedSize === 'number'

	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox={icon.viewBox}
			fill="none"
			stroke="currentColor"
			strokeWidth={icon.strokeWidth}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
			className={cn(!isNumeric && sizeMap[resolvedSize], className)}
			style={isNumeric ? { width: resolvedSize, height: resolvedSize, ...style } : style}
			{...props}
		>
			{icon.content}
		</svg>
	)
}

export function CheckboxIcon({
	className,
	...props
}: React.SVGProps<SVGSVGElement> & { className?: string }) {
	return (
		<svg
			data-slot="checkbox-check"
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 14 14"
			fill="none"
			aria-hidden="true"
			className={cn(
				'pointer-events-none absolute size-3 stroke-(--checkbox-check) opacity-0',
				className,
			)}
			{...props}
		>
			<path d="M3 8L6 11L11 3.5" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	)
}
