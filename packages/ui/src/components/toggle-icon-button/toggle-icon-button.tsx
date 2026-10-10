'use client'

import type { ComponentProps, ReactElement } from 'react'
import { cn, composeEventHandlers } from '../../core'
import { useControllableFlag } from '../../hooks/use-controllable'
import { k } from '../../recipes/kata/toggle-icon-button'
import type { AccessibleName } from '../../types'
import { Button, type ButtonVariants } from '../button'
import { Icon } from '../icon'
import { ToggleIconButtonIcons } from './toggle-icon-button-icons'

/**
 * Props for {@link ToggleIconButton}. Icon-only by design: `AccessibleName`
 * requires `aria-label` or `aria-labelledby`, so the button always has an
 * accessible name. Inherits `<button>` attributes except `children`, `type`,
 * `color`, and the label attributes.
 */
export type ToggleIconButtonProps = AccessibleName & {
	/**
	 * Controlled pressed state, reflected as `aria-pressed`. Pair with `onPressedChange`.
	 *
	 * @defaultValue Uncontrolled: the state starts from `defaultPressed`.
	 */
	pressed?: boolean
	/**
	 * Initial pressed state when uncontrolled.
	 * @defaultValue false
	 */
	defaultPressed?: boolean
	/** Fires with the next pressed state when the button is activated. */
	onPressedChange?: (pressed: boolean) => void
	/** Icon shown in the unpressed state. */
	icon: ReactElement
	/**
	 * Icon shown in the pressed state.
	 * @defaultValue icon
	 */
	pressedIcon?: ReactElement
	/**
	 * Cross-fade between `icon` and `pressedIcon` on toggle; set false for an instant swap.
	 * @defaultValue true
	 */
	animate?: boolean
	/** Recipe color forwarded to the underlying {@link Button}. @defaultValue 'zinc' */
	color?: ButtonVariants['color']
	/** The density step of the button. Omit it to take the step of the nearest density scope. */
	size?: ButtonVariants['size']
	className?: string
} & Omit<ComponentProps<'button'>, 'children' | 'type' | 'color' | 'aria-label' | 'aria-labelledby'>

/**
 * Two-state icon Button reflecting `pressed` via `aria-pressed`. Swaps `icon`
 * for `pressedIcon` and, unless `animate` is false, cross-fades between the two.
 * Requires `aria-label` or `aria-labelledby`.
 *
 * @remarks
 * A consumer `onClick` runs before the toggle. Its `preventDefault()` does not
 * cancel the toggle, because the toggle is the activation of the button.
 */
export function ToggleIconButton({
	pressed: pressedProp,
	defaultPressed,
	onPressedChange,
	onClick,
	icon,
	pressedIcon = icon,
	animate = true,
	size,
	className,
	...props
}: ToggleIconButtonProps) {
	const [pressed, setPressed] = useControllableFlag({
		value: pressedProp,
		defaultValue: defaultPressed,
		onValueChange: onPressedChange,
	})

	// The toggle is the activation the button exists to perform, so a
	// consumer's preventDefault() does not cancel it (CONVENTIONS.md §3.9).
	const handleClick = composeEventHandlers(onClick, () => setPressed(!pressed), {
		checkForDefaultPrevented: false,
	})

	// Animated: both icons ride the `prefix` slot and cross-fade. Instant: the
	// current icon is the sole child and `prefix` stays absent.
	return (
		// No library selector reads the anchor, so it goes before the spread and a
		// wrapper such as CopyButton can re-anchor the button (CONVENTIONS.md §3.9).
		<Button
			data-slot="toggle-icon-button"
			{...props}
			type="button"
			variant="bare"
			size={size}
			onClick={handleClick}
			aria-pressed={pressed}
			className={cn(k.base, className)}
			prefix={
				animate ? (
					<ToggleIconButtonIcons icon={icon} pressedIcon={pressedIcon} pressed={pressed} />
				) : undefined
			}
		>
			{animate ? null : <Icon icon={pressed ? pressedIcon : icon} />}
		</Button>
	)
}
