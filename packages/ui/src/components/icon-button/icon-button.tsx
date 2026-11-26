'use client'

import {
	Children,
	type ComponentProps,
	type MouseEventHandler,
	type ReactElement,
	type ReactNode,
} from 'react'
import { ariaAttr } from '../../core/aria-attr'
import { composeEventHandlers } from '../../core/compose-event-handlers'
import { dataAttr } from '../../core/data-attr'
import { useControllableFlag } from '../../hooks/use-controllable'
import type { FloatingPlacement } from '../../hooks/use-floating-panel'
import type { LinkProps } from '../../primitives/link/context'
import type { ButtonVariants } from '../../recipes/kata/button'
import { Button } from '../button'
import { Icon, type IconProps } from '../icon'
import { Tooltip, TooltipContent, TooltipTrigger } from '../tooltip'
import { IconButtonSwap } from './icon-button-swap'

/** The attributes that IconButton owns. A caller cannot set them through the element props. @internal */
type OwnedAttributes =
	| 'aria-label'
	| 'aria-labelledby'
	| 'aria-pressed'
	| 'children'
	| 'color'
	| 'disabled'
	| 'prefix'
	| 'type'

/**
 * The accessible name and the tooltip. A tooltip of `true` shows the
 * `aria-label`, so a name from `aria-labelledby` takes tooltip content instead.
 */
type IconButtonName =
	| {
			'aria-label': string
			/**
			 * A tooltip on hover and focus. `true` shows the `aria-label`, so the
			 * visible label and the accessible name agree (WCAG 2.5.3). Content shows
			 * more than the name, such as the level of a zoom step or a shortcut.
			 * @defaultValue no tooltip
			 */
			tooltip?: ReactNode
	  }
	| {
			'aria-labelledby': string
			/** Tooltip content. A name from `aria-labelledby` has no text to show, so `true` is not available. @defaultValue no tooltip */
			tooltip?: Exclude<ReactNode, boolean>
	  }

/** The props that each IconButton takes, a toggle or an action. */
type IconButtonOwnProps = {
	/**
	 * The icon. It is a Lucide icon or an element, as {@link Icon} takes. A list
	 * of elements gives icons that the CSS shows one at a time, such as one icon
	 * for each layout. A toggle with a `pressedIcon` takes one icon.
	 */
	icon: IconProps['icon'] | readonly ReactElement[]
	/** The palette color of the button. @defaultValue 'zinc' */
	color?: ButtonVariants['color']
	/** The density step of the button. Omit it to take the step of the nearest density scope. */
	size?: ButtonVariants['size']
	/**
	 * Shows a spinner in place of the icon, and cancels each activation. The
	 * button keeps its square and its focus.
	 * @defaultValue false
	 */
	loading?: boolean
	/**
	 * Lets a locked scope, such as a `Form` while a submit runs, make the button
	 * inert. Pass `false` for a button that writes no field, such as a view
	 * control.
	 * @defaultValue false for a toggle, which writes no field. true for an action.
	 */
	lockable?: boolean
	/**
	 * The side of the tooltip. A group of icon buttons puts it across the axis
	 * that the group runs along, so the tooltip does not cover the next button.
	 * @defaultValue 'top'
	 */
	tooltipPlacement?: FloatingPlacement
	'data-slot'?: string
	className?: string
}

/**
 * The fill style of the button. `bare` is the only variant with the square
 * icon floor, so it suits a button in a field, a row, or a bar.
 * @defaultValue 'bare'
 */
type IconButtonVariant = ButtonVariants['variant']

/**
 * How a toggle shows its pressed state. With `pressedIcon`, the icon shows it,
 * so each variant is available. Without it, the held-down wash shows it. Only
 * `bare` and `plain` have a wash, so the type takes only these two.
 */
type IconButtonToggleLook =
	| {
			/**
			 * The icon of the pressed state. Without it, the button shows the pressed
			 * state with the held-down wash of its variant: `data-active` on `bare`,
			 * and the `soft` fill on `plain`. Only these two variants have a wash.
			 */
			pressedIcon: IconProps['icon']
			icon: IconProps['icon']
			/**
			 * Cross-fades between `icon` and `pressedIcon`. Set false for an instant swap.
			 * @defaultValue true
			 */
			animate?: boolean
			/** {@inheritDoc IconButtonVariant} */
			variant?: IconButtonVariant
	  }
	| {
			pressedIcon?: never
			animate?: never
			/**
			 * The fill style of the button. A toggle with no `pressedIcon` shows its
			 * state with the held-down wash, which only `bare` and `plain` have.
			 * @defaultValue 'bare'
			 */
			variant?: 'bare' | 'plain'
	  }

/** The props of a toggle: the pressed state and the icon of that state. */
type IconButtonToggleProps = IconButtonToggleLook & {
	/**
	 * Controlled pressed state, reflected as `aria-pressed`. Pair it with
	 * `onPressedChange`. Each of `pressed`, `defaultPressed`, and
	 * `onPressedChange` makes the button a toggle.
	 * @defaultValue Uncontrolled, with `defaultPressed` as the first state.
	 */
	pressed?: boolean
	/**
	 * Initial pressed state when uncontrolled.
	 * @defaultValue false
	 */
	defaultPressed?: boolean
	/** Fires when the button is activated, with the next pressed state. */
	onPressedChange?: (pressed: boolean) => void
	/** A toggle is a button, not a link. */
	href?: never
	/**
	 * Disables the button but keeps it focusable. It is `aria-disabled`, stays in
	 * the tab order, and drops each press.
	 * @defaultValue false
	 */
	disabled?: boolean
} & Omit<ComponentProps<'button'>, OwnedAttributes | 'className'>

/**
 * How an action shows that its target is on. An action has no pressed state,
 * but `active` gives it the held-down wash, which only `bare` and `plain` have.
 */
type IconButtonActionLook =
	| {
			active?: never
			/** {@inheritDoc IconButtonVariant} */
			variant?: IconButtonVariant
	  }
	| {
			/**
			 * Shows the held-down wash, with no `aria-pressed`. Use it on an action
			 * whose target is on, such as the trigger of a search while a query is
			 * set. A press of such a button opens a panel or runs a command, so it is
			 * not a toggle.
			 */
			active: boolean
			/**
			 * The fill style of the button. An `active` action shows its state with
			 * the held-down wash, which only `bare` and `plain` have.
			 * @defaultValue 'bare'
			 */
			variant?: 'bare' | 'plain'
	  }

/** The props of an action: a button, or a link with `href`. An action has no pressed state. */
type IconButtonActionProps = IconButtonActionLook & {
	pressed?: never
	defaultPressed?: never
	onPressedChange?: never
	pressedIcon?: never
	animate?: never
} & (
		| ({
				href?: never
				/**
				 * Disables the button but keeps it focusable. It is `aria-disabled`, stays
				 * in the tab order, and drops each press.
				 *
				 * @remarks Not the native `disabled`. A press can disable its own button,
				 * such as a zoom step at the last level, and a native `disabled` then drops
				 * the focus to the page (WCAG 2.4.3).
				 * @defaultValue false
				 */
				disabled?: boolean
		  } & Omit<ComponentProps<'button'>, OwnedAttributes | 'className'>)
		| ({
				/** The link target. With it, the button is the registered link. */
				href: string
				disabled?: never
		  } & Omit<LinkProps, OwnedAttributes | 'className' | 'href'>)
	)

/**
 * Props for {@link IconButton}. `AccessibleName` is required: `aria-label` or
 * `aria-labelledby`. With `pressed`, `defaultPressed`, or `onPressedChange`,
 * the button is a toggle. Without them, it is an action, and `href` makes it a
 * link.
 */
export type IconButtonProps = IconButtonName &
	IconButtonOwnProps &
	(IconButtonToggleProps | IconButtonActionProps)

/** The props after the destructure, as one loose shape for the spread. @internal */
type IconButtonRest = Omit<
	ComponentProps<'button'>,
	Exclude<OwnedAttributes, 'aria-label' | 'aria-labelledby'>
> & {
	href?: string
	'data-slot'?: string
}

/** The pressed state of a toggle, and the click that the button takes. @internal */
function usePress({
	pressed: pressedProp,
	defaultPressed,
	onPressedChange,
	onClick,
	disabled,
}: Pick<IconButtonToggleProps, 'pressed' | 'defaultPressed' | 'onPressedChange'> & {
	onClick: MouseEventHandler<HTMLButtonElement> | undefined
	disabled: boolean
}) {
	const toggle =
		pressedProp !== undefined || defaultPressed !== undefined || onPressedChange !== undefined

	const [pressed, setPressed] = useControllableFlag({
		value: pressedProp,
		defaultValue: defaultPressed,
		onValueChange: onPressedChange,
	})

	// The toggle is the activation the button exists to perform, so a consumer's
	// preventDefault() does not cancel it (CONVENTIONS.md §3.9).
	const toggleClick = composeEventHandlers(onClick, () => setPressed(!pressed), {
		checkForDefaultPrevented: false,
	})

	// A disabled button drops each press.
	if (disabled) return { toggle, pressed, onClick: undefined }

	return { toggle, pressed, onClick: toggle ? toggleClick : onClick }
}

/**
 * The icon content of the button. Animated: both icons ride the `prefix` slot
 * and cross-fade. Otherwise the current icon is the sole child, and `prefix`
 * stays absent.
 *
 * @internal
 */
function iconButtonContent(
	icon: IconButtonOwnProps['icon'],
	pressedIcon: IconProps['icon'] | undefined,
	pressed: boolean,
	animate: boolean,
): { prefix?: ReactNode; children?: ReactNode } {
	// A list of icons is never a swap: the type gives a pressed icon only one icon.
	if (isIconList(icon)) return { children: Children.map(icon, (each) => <Icon icon={each} />) }

	if (pressedIcon === undefined) return { children: <Icon icon={icon} /> }

	if (animate) {
		return { prefix: <IconButtonSwap icon={icon} pressedIcon={pressedIcon} pressed={pressed} /> }
	}

	return { children: <Icon icon={pressed ? pressedIcon : icon} /> }
}

/** Whether `icon` is a list of icons. @internal */
function isIconList(icon: IconButtonOwnProps['icon']): icon is readonly ReactElement[] {
	return Array.isArray(icon)
}

/** Puts the tooltip of an IconButton around it, or gives the button alone. @internal */
function IconButtonTooltip({
	tooltip,
	label,
	placement,
	children,
}: {
	tooltip: ReactNode
	label: string | undefined
	placement: FloatingPlacement | undefined
	children: ReactElement
}) {
	if (tooltip === undefined || tooltip === null || tooltip === false) return children

	return (
		<Tooltip placement={placement}>
			<TooltipTrigger>{children}</TooltipTrigger>
			<TooltipContent>{tooltip === true ? label : tooltip}</TooltipContent>
		</Tooltip>
	)
}

/**
 * A button that shows only an icon. It is the one icon-only control of the
 * package: an action, a toggle, or a link.
 *
 * - An action, such as Close or Remove, has no pressed state.
 * - A toggle takes `pressed`, `defaultPressed`, or `onPressedChange`, and shows
 *   its state through `aria-pressed`. With `pressedIcon`, the two icons
 *   cross-fade. Without it, the button takes the held-down wash: `data-active`
 *   on `bare`, and the `soft` fill on `plain`. The wash keeps the size of the
 *   button, so a bar does not reflow when a toggle flips.
 * - A link takes `href`.
 * - An action with `active` takes the held-down wash with no `aria-pressed`,
 *   for a button whose target is on, such as a search trigger with a query.
 *
 * `tooltip` adds a tooltip. `disabled` keeps the focus: the button is
 * `aria-disabled`, stays in the tab order, and drops each press.
 *
 * @remarks
 * A toggle keeps one accessible name, and `aria-pressed` gives its state. Do not
 * change the name with the state, such as "Show" and "Hide": a screen reader then
 * reads the state two times (the APG toggle-button pattern).
 *
 * A consumer `onClick` runs before the toggle. Its `preventDefault()` does not
 * cancel the toggle, because the toggle is the activation of the button
 * (CONVENTIONS.md §3.9).
 *
 * Rest props reach the `Button` before the wiring that this component owns, so
 * a caller can stamp the state of its own control, such as `aria-expanded` on a
 * control that discloses a panel. A wrapper, such as `CopyButton`, can give its
 * own `data-slot`.
 */
export function IconButton(props: IconButtonProps) {
	const {
		icon,
		pressedIcon,
		pressed: pressedProp,
		defaultPressed,
		onPressedChange,
		animate = true,
		variant = 'bare',
		tooltip,
		tooltipPlacement,
		disabled = false,
		lockable,
		active = false,
		onClick: onClickProp,
		...rest
	} = props as IconButtonOwnProps &
		Omit<IconButtonToggleProps, 'href' | keyof IconButtonToggleLook> & {
			active?: boolean
			pressedIcon?: IconProps['icon']
			animate?: boolean
			variant?: IconButtonVariant
			tooltip?: ReactNode
		} & IconButtonRest

	const { toggle, pressed, onClick } = usePress({
		pressed: pressedProp,
		defaultPressed,
		onPressedChange,
		onClick: onClickProp,
		disabled,
	})

	// A toggle with a pressed icon shows its state by the icon. A toggle with one
	// icon shows it by the held-down wash, as an `active` action does.
	const swapIcon = toggle ? pressedIcon : undefined

	const held = toggle ? pressed && swapIcon === undefined : active

	const { prefix, children } = iconButtonContent(icon, swapIcon, pressed, animate)

	// A tooltip of `true` echoes the accessible name, so its description would
	// say the name a second time. An explicit key wins over the description of
	// the trigger. A description from the caller stays.
	const echo = tooltip === true && !('aria-describedby' in rest)

	return (
		<IconButtonTooltip tooltip={tooltip} label={rest['aria-label']} placement={tooltipPlacement}>
			<Button
				lockable={lockable ?? !toggle}
				data-slot="icon-button"
				{...(rest as ComponentProps<typeof Button>)}
				type={rest.href === undefined ? 'button' : undefined}
				variant={held && variant === 'plain' ? 'soft' : variant}
				data-active={dataAttr(held && variant === 'bare')}
				aria-pressed={toggle ? pressed : undefined}
				aria-disabled={ariaAttr(disabled)}
				data-disabled={dataAttr(disabled)}
				{...(echo && { 'aria-describedby': undefined })}
				// One handler serves the button and the link.
				onClick={onClick as MouseEventHandler<HTMLElement> | undefined}
				prefix={prefix}
			>
				{children}
			</Button>
		</IconButtonTooltip>
	)
}
