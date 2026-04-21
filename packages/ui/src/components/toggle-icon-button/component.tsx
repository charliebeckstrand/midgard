'use client'

import type { ReactElement } from 'react'
import { cn } from '../../core'
import { kumi } from '../../recipes'
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
				prefix={<Icon icon={pressed ? activeIcon : icon} />}
			/>
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
			prefix={
				<>
					<span className={cn(k.transition, pressed ? k.inactive : k.active)}>
						<Icon icon={icon} />
					</span>
					<span
						className={cn(
							'absolute inset-0',
							'flex',
							kumi.center,
							k.transition,
							pressed ? k.active : k.inactive,
						)}
					>
						<Icon icon={activeIcon} />
					</span>
				</>
			}
		/>
	)
}
