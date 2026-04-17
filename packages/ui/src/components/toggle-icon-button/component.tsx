'use client'

import type { ReactElement } from 'react'
import { cn } from '../../core'
import { Button } from '../button'
import { Icon } from '../icon'
import { k } from './variants'

type Size = 'xs' | 'sm' | 'md' | 'lg'

export type ToggleIconButtonProps = {
	pressed: boolean
	icon: ReactElement
	activeIcon?: ReactElement
	animate?: boolean
	size?: Size
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'button'>, 'children' | 'type' | 'color'>

export function ToggleIconButton({
	pressed,
	icon,
	activeIcon = icon,
	animate = true,
	size = 'md',
	className,
	...props
}: ToggleIconButtonProps) {
	if (!animate) {
		return (
			<Button
				{...props}
				variant="ghost"
				size={size}
				data-slot="toggle-icon-button"
				aria-pressed={pressed}
				className={cn(k.base, className)}
			>
				<Icon icon={pressed ? activeIcon : icon} />
			</Button>
		)
	}

	return (
		<Button
			{...props}
			variant="ghost"
			size={size}
			data-slot="toggle-icon-button"
			aria-pressed={pressed}
			className={cn(k.base, className)}
		>
			<span className={cn(k.transition, pressed ? k.inactive : k.active)}>
				<Icon icon={icon} />
			</span>
			<span
				className={cn(
					'absolute inset-0 flex items-center justify-center',
					k.transition,
					pressed ? k.active : k.inactive,
				)}
			>
				<Icon icon={activeIcon} />
			</span>
		</Button>
	)
}
