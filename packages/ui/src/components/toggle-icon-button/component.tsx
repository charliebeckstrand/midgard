'use client'

import type { ReactElement } from 'react'
import { cn } from '../../core'
import { katachi } from '../../recipes'
import { Button } from '../button'
import { Icon } from '../icon'

type Size = 'xs' | 'sm' | 'md' | 'lg'

export type ToggleIconButtonProps = {
	pressed: boolean
	icon: ReactElement
	activeIcon: ReactElement
	size?: Size
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'button'>, 'children' | 'type' | 'color'>

const k = katachi.toggleIconButton

export function ToggleIconButton({
	pressed,
	icon,
	activeIcon,
	size = 'md',
	className,
	...props
}: ToggleIconButtonProps) {
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
