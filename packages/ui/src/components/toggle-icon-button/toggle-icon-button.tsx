import type { ComponentPropsWithoutRef, ReactElement, Ref } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/toggle-icon-button'
import type { AccessibleName, Size } from '../../types'
import { Button, type ButtonVariants } from '../button'
import { Icon } from '../icon'

/**
 * Props for {@link ToggleIconButton}. Icon-only by design: `AccessibleName`
 * requires `aria-label` or `aria-labelledby`, so the button always has an
 * accessible name. Inherits `<button>` attributes except `children`, `type`,
 * `color`, and the label attributes.
 */
export type ToggleIconButtonProps = AccessibleName & {
	/** Pressed state, reflected as `aria-pressed`. */
	pressed: boolean
	/** Icon shown in the unpressed state. */
	icon: ReactElement
	/**
	 * Icon shown in the pressed state.
	 * @defaultValue `icon`
	 */
	pressedIcon?: ReactElement
	/**
	 * Cross-fade between `icon` and `pressedIcon` on toggle; set false for an instant swap.
	 * @defaultValue true
	 */
	animate?: boolean
	/** Recipe color forwarded to the underlying {@link Button}. */
	color?: ButtonVariants['color']
	size?: Size
	className?: string
	ref?: Ref<HTMLButtonElement>
} & Omit<
		ComponentPropsWithoutRef<'button'>,
		'children' | 'type' | 'color' | 'aria-label' | 'aria-labelledby'
	>

/**
 * Two-state icon Button reflecting `pressed` via `aria-pressed`. Swaps `icon`
 * for `pressedIcon` and, unless `animate` is false, cross-fades between the two.
 * Requires `aria-label` or `aria-labelledby`.
 */
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

	// Cross-fade classes sit on the icons themselves, not wrapper spans: the
	// Button's slot projection (`*:data-[slot=icon]`) sizes direct children
	// only, and a wrapped Icon falls back to its static md default.
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
					<Icon icon={icon} className={cn(k.transition, pressed ? k.inactive : k.active)} />
					<Icon
						icon={pressedIcon}
						className={cn('absolute inset-0 m-auto', k.transition, pressed ? k.active : k.inactive)}
					/>
				</>
			}
		/>
	)
}
