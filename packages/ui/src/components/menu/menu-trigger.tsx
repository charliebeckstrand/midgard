'use client'

import {
	type ComponentPropsWithoutRef,
	cloneElement,
	isValidElement,
	type KeyboardEvent,
	type MouseEvent,
	type ReactElement,
	type Ref,
	useRef,
} from 'react'
import { cn } from '../../core'
import { useComposedRef } from '../../hooks'
import { useMenuActions, useMenuState } from './context'

/** Props for {@link MenuTrigger}: either a single child element to clone or native `<button>` attributes. */
export type MenuTriggerProps =
	| ({ children: ReactElement } & { className?: string })
	| ComponentPropsWithoutRef<'button'>

/**
 * Disclosure trigger for a dropdown {@link Menu}. Clones a single child element
 * or renders its own `<button>`, wiring `aria-haspopup="menu"`,
 * `aria-expanded`, and `aria-controls` and toggling open state on click while
 * composing with the consumer's own `onClick`. A cloned child's own `ref`
 * merges with the floating reference, so the trigger element stays reachable
 * (e.g. as a focus target).
 *
 * The trigger keeps focus while the menu is open, so Tab off it closes the menu
 * and lets focus proceed to the next tabbable in one keystroke.
 */
export function MenuTrigger({ children, className, ...props }: MenuTriggerProps) {
	const { open, menuId, getReferenceProps } = useMenuState()

	const { setOpen, dismissToTab, rovingKeyDown, triggerRef, setReference } = useMenuActions()

	// Merge the child's own ref (React 19 ref-as-prop) with the floating
	// reference so a consumer can register the trigger element (e.g. as a focus
	// target) rather than have it clobbered — matching `TooltipTrigger`/
	// `PopoverTrigger`.
	const childRef = isValidElement(children)
		? ((children.props as { ref?: Ref<HTMLButtonElement> }).ref ?? undefined)
		: undefined

	const mergeRefs = useComposedRef<HTMLButtonElement>(triggerRef, setReference, childRef)

	// The menu opens once per discrete activation-key press on the trigger. The
	// trigger keeps native timing — Enter fires the button's click on keydown,
	// Space on keyup — but its OS auto-repeat is swallowed, so a held key neither
	// rapidly re-toggles the menu (Enter's per-repeat clicks) nor opens it when the
	// key was already down as focus arrived (released from a HoldButton whose
	// completion moved focus here). A fresh, non-repeat keydown arms; opening then
	// requires letting go and pressing again.
	const activationHeldRef = useRef(false)

	// Focus rests on the trigger while the menu is open, so every navigation key
	// arrives here rather than in the panel. `rovingKeyDown` moves the
	// `aria-activedescendant` cursor over the items (arrow / Home / End /
	// type-ahead) and activates the active row on Enter/Space — no-op while closed.
	// Tab closes without `preventDefault`, letting the browser carry focus onward;
	// `dismissToTab` marks the close `'focus-out'` so focus is not yanked back.
	const handleTriggerKeyDown = (event: KeyboardEvent) => {
		if (event.key === 'Enter' || event.key === ' ') {
			// Swallow every auto-repeat's native click; only a fresh press arms and
			// activates. This stops a held Enter from rapid-toggling and a key held on
			// arrival (its first keydown landed elsewhere) from opening the menu.
			if (event.repeat) {
				event.preventDefault()
			} else {
				activationHeldRef.current = true
			}
		}

		rovingKeyDown(event)

		if (open && event.key === 'Tab') dismissToTab(event.nativeEvent)
	}

	// Space activates a button on keyup; suppress that release when no fresh press
	// armed the trigger (the key was held on arrival). The cycle ends here, so the
	// next press must re-arm.
	const handleTriggerKeyUp = (event: KeyboardEvent) => {
		if (event.key !== 'Enter' && event.key !== ' ') return

		if (!activationHeldRef.current) event.preventDefault()

		activationHeldRef.current = false
	}

	// Consumer/child props route through `getReferenceProps`, which composes
	// their event handlers with the floating interactions instead of clobbering
	// them (the `TooltipTrigger`/`PopoverTrigger` pattern). The toggle composes
	// with the consumer's own onClick: theirs runs first.
	if (isValidElement(children)) {
		const child = children as ReactElement<Record<string, unknown>>

		const childOnClick = child.props.onClick as ((event: MouseEvent) => void) | undefined

		const childOnKeyDown = child.props.onKeyDown as ((event: KeyboardEvent) => void) | undefined

		const childOnKeyUp = child.props.onKeyUp as ((event: KeyboardEvent) => void) | undefined

		return cloneElement(child, {
			...getReferenceProps({
				...child.props,
				onClick: (event: MouseEvent) => {
					childOnClick?.(event)
					setOpen(!open)
				},
				onKeyDown: (event: KeyboardEvent) => {
					childOnKeyDown?.(event)
					handleTriggerKeyDown(event)
				},
				onKeyUp: (event: KeyboardEvent) => {
					childOnKeyUp?.(event)
					handleTriggerKeyUp(event)
				},
			}),
			ref: mergeRefs,
			'aria-haspopup': 'menu',
			'aria-expanded': open,
			'aria-controls': open ? menuId : undefined,
			'data-slot': 'menu-trigger',
			className: cn(className, child.props.className as string | undefined),
		})
	}

	const {
		onClick: consumerOnClick,
		onKeyDown: consumerOnKeyDown,
		onKeyUp: consumerOnKeyUp,
		...rest
	} = props as ComponentPropsWithoutRef<'button'>

	return (
		<button
			ref={mergeRefs}
			type="button"
			aria-haspopup="menu"
			aria-expanded={open}
			aria-controls={open ? menuId : undefined}
			data-slot="menu-trigger"
			className={cn(className)}
			{...getReferenceProps({
				...rest,
				onClick: (event: MouseEvent<HTMLButtonElement>) => {
					consumerOnClick?.(event)
					setOpen(!open)
				},
				onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => {
					consumerOnKeyDown?.(event)
					handleTriggerKeyDown(event)
				},
				onKeyUp: (event: KeyboardEvent<HTMLButtonElement>) => {
					consumerOnKeyUp?.(event)
					handleTriggerKeyUp(event)
				},
			})}
		>
			{children}
		</button>
	)
}
