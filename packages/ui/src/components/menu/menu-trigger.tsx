'use client'

import {
	type ComponentProps,
	isValidElement,
	type KeyboardEvent,
	type ReactElement,
	type Ref,
	type SyntheticEvent,
	useId,
	useRef,
} from 'react'
import { cn, composeEventHandlers } from '../../core'
import { useDeferredFloatingReference } from '../../hooks/use-deferred-floating-reference'
import { useStableEvent } from '../../hooks/use-stable-event'
import { useMenuActions, useMenuState } from './context'
import { useMenuPointer } from './use-menu-pointer'

/** Props for {@link MenuTrigger}: either a single child element to clone or native `<button>` attributes. */
export type MenuTriggerProps =
	| ({ children: ReactElement } & { className?: string })
	| ComponentProps<'button'>

/**
 * The props of a cloned child, with the other props of the trigger merged in.
 * The child wins a clash, as its `className` does. A handler on both runs the
 * handler of the child first, and its `preventDefault()` cancels the other.
 *
 * @internal
 */
function mergeTriggerProps(
	triggerProps: Record<string, unknown>,
	childProps: Record<string, unknown>,
): Record<string, unknown> {
	const merged: Record<string, unknown> = { ...triggerProps, ...childProps }

	for (const [key, triggerValue] of Object.entries(triggerProps)) {
		const childValue = childProps[key]

		if (
			/^on[A-Z]/.test(key) &&
			typeof triggerValue === 'function' &&
			typeof childValue === 'function'
		) {
			merged[key] = composeEventHandlers(
				childValue as (event: SyntheticEvent) => void,
				triggerValue as (event: SyntheticEvent) => void,
			)
		}
	}

	return merged
}

/**
 * Disclosure trigger for a dropdown {@link Menu}. Clones a single child element
 * or renders its own `<button>`, wiring `aria-haspopup="menu"`,
 * `aria-expanded`, and `aria-controls`. It toggles open state on click, and
 * composes with the consumer's own `onClick`. A cloned child's own `ref`
 * merges with the floating reference, so the trigger element stays reachable
 * (e.g. as a focus target). The other props of the trigger, such as an
 * `aria-label`, go to a cloned child. The props of the child win a clash, and a
 * handler on both runs the two.
 *
 * The trigger names the dropdown panel through `aria-labelledby`. It keeps the
 * `id` of a cloned child or of the consumer, and else gets a generated `id`.
 *
 * The trigger keeps focus while the menu is open. Tab off it therefore closes
 * the menu, and lets focus proceed to the next tabbable in one keystroke.
 */
export function MenuTrigger({ children, className, ...props }: MenuTriggerProps) {
	const { open, menuId, getReferenceProps } = useMenuState()

	const { dismissToTab, rovingKeyDown, triggerRef, setReference } = useMenuActions()

	const { enterSubmenu } = useMenuPointer()

	// The dropdown panel points its `aria-labelledby` at the trigger, so the
	// trigger always has an id. An id of the child or of the consumer stays.
	const fallbackId = useId()

	// Merge the child's own ref (React 19 ref-as-prop) with the floating
	// reference so a consumer can register the trigger element (e.g. as a focus
	// target) rather than have it clobbered — matching `TooltipTrigger`/
	// `PopoverTrigger`.
	const childRef = isValidElement(children)
		? ((children.props as { ref?: Ref<HTMLElement> }).ref ?? undefined)
		: undefined

	// Registration waits for the first open, so a closed menu renders once
	// rather than twice. That takes a closed menu from 0.064ms to 0.036ms,
	// measured at a fan-out of fifty
	// (`__benchmarks__/browser/menu-mount.bench.tsx`).
	const mergeRefs = useDeferredFloatingReference<HTMLElement>(
		setReference,
		open,
		triggerRef,
		childRef,
	)

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
	const handleTriggerKeyDown = useStableEvent((event: KeyboardEvent) => {
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

		// A submenu hovered open under this dropdown owns the arrows while it is up,
		// the same as in a right-click menu — the difference being that focus rests
		// here, so the press arrives on the trigger rather than on the parent row.
		if (open && enterSubmenu(event.key)) {
			event.preventDefault()

			return
		}

		rovingKeyDown(event)

		if (open && event.key === 'Tab') dismissToTab(event.nativeEvent)
	})

	// Space activates a button on keyup; suppress that release when no fresh press
	// armed the trigger (the key was held on arrival). The cycle ends here, so the
	// next press must re-arm.
	const handleTriggerKeyUp = useStableEvent((event: KeyboardEvent) => {
		if (event.key !== 'Enter' && event.key !== ' ') return

		if (!activationHeldRef.current) event.preventDefault()

		activationHeldRef.current = false
	})

	// Consumer/child props route through `getReferenceProps`, which composes
	// their event handlers with the floating interactions instead of clobbering
	// them (the `TooltipTrigger`/`PopoverTrigger` pattern). The toggle itself is
	// `useClick`'s, composed at the state level, so only the key handlers wrap.
	if (isValidElement(children)) {
		const child = children as ReactElement<Record<string, unknown>>

		const childProps =
			Object.keys(props).length > 0 ? mergeTriggerProps(props, child.props) : child.props

		const childOnKeyDown = childProps.onKeyDown as ((event: KeyboardEvent) => void) | undefined

		const childOnKeyUp = childProps.onKeyUp as ((event: KeyboardEvent) => void) | undefined

		// The clone renders the child's type through JSX, not through `cloneElement`.
		// The React Compiler rejects a ref passed to a function during render.
		const Child = child.type

		return (
			<Child
				key={child.key}
				{...childProps}
				{...getReferenceProps({
					...childProps,
					onKeyDown: (event: KeyboardEvent) => {
						childOnKeyDown?.(event)
						handleTriggerKeyDown(event)
					},
					onKeyUp: (event: KeyboardEvent) => {
						childOnKeyUp?.(event)
						handleTriggerKeyUp(event)
					},
				})}
				ref={mergeRefs}
				id={(childProps.id as string | undefined) ?? fallbackId}
				aria-haspopup="menu"
				aria-expanded={open}
				aria-controls={open ? menuId : undefined}
				data-slot="menu-trigger"
				className={cn(className, child.props.className as string | undefined)}
			/>
		)
	}

	const {
		onKeyDown: consumerOnKeyDown,
		onKeyUp: consumerOnKeyUp,
		...rest
	} = props as ComponentProps<'button'>

	return (
		<button
			ref={mergeRefs}
			data-slot="menu-trigger"
			className={cn(className)}
			// Consumer props spread first; the type and the menu wiring below take
			// precedence.
			{...getReferenceProps({
				...rest,
				onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => {
					consumerOnKeyDown?.(event)
					handleTriggerKeyDown(event)
				},
				onKeyUp: (event: KeyboardEvent<HTMLButtonElement>) => {
					consumerOnKeyUp?.(event)
					handleTriggerKeyUp(event)
				},
			})}
			type="button"
			id={rest.id ?? fallbackId}
			aria-haspopup="menu"
			aria-expanded={open}
			aria-controls={open ? menuId : undefined}
		>
			{children}
		</button>
	)
}
