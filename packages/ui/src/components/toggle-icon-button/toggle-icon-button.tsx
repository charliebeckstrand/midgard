import type { ComponentPropsWithoutRef, ReactElement } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/toggle-icon-button'
import type { Size } from '../../types'
import { Button } from '../button'
import { Icon } from '../icon'

// Icon-only by design — require one of these so the button always has an
// accessible name.
type ToggleIconButtonLabel = { 'aria-label': string } | { 'aria-labelledby': string }

export type ToggleIconButtonProps = ToggleIconButtonLabel & {
	pressed: boolean
	icon: ReactElement
	pressedIcon?: ReactElement
	animate?: boolean
	size?: Size
	className?: string
} & Omit<
		ComponentPropsWithoutRef<'button'>,
		'children' | 'type' | 'color' | 'aria-label' | 'aria-labelledby'
	>

export function ToggleIconButton({
	pressed,
	icon,
	pressedIcon = icon,
	animate = true,
	size,
	className,
	...props
}: ToggleIconButtonProps) {
	if (!animate) {
		return (
			<Button
				{...props}
				variant="bare"
				size={size}
				data-slot="toggle-icon-button"
				aria-pressed={pressed}
				className={cn(k.base, className)}
			>
				<Icon icon={pressed ? pressedIcon : icon} />
			</Button>
		)
	}

	return (
		<Button
			{...props}
			variant="bare"
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
							'flex items-center justify-center',
							k.transition,
							pressed ? k.active : k.inactive,
						)}
					>
						<Icon icon={pressedIcon} />
					</span>
				</>
			}
		/>
	)
}
