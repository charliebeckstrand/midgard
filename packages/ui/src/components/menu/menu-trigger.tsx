'use client'

import { useComposedRefs } from 'motion/react'
import { type ComponentProps, type KeyboardEvent, type Ref, useId, useRef } from 'react'
import { cn, dataAttr } from '../../core'
import { useDeferredFloatingReference } from '../../hooks/use-deferred-floating-reference'
import { useStableEvent } from '../../hooks/use-stable-event'
import {
	mergeTriggerProps,
	TriggerChild,
	triggerChild,
} from '../../primitives/trigger-child/trigger-child'
import { useMenuActions, useMenuState } from './context'
import { useMenuPointer } from './use-menu-pointer'

/**
 * Props for {@link MenuTrigger}. The `<button>` of the trigger takes the rest.
 * With a single element child, the clone of the child takes the rest instead.
 */
export type MenuTriggerProps = ComponentProps<'button'>

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
 * The trigger writes `data-slot="menu-trigger"` only on a host element child,
 * such as a `<button>`, that has no `data-slot` of its own. A component child,
 * such as a `<Button>`, keeps the anchor that it writes for itself.
 *
 * The trigger keeps focus while the menu is open. Tab off it therefore closes
 * the menu, and lets focus proceed to the next tabbable in one keystroke.
 *
 * The trigger stamps `data-open` while the menu is open, and `data-disabled`
 * while it is disabled.
 */
export function MenuTrigger({ children, className, ref, ...props }: MenuTriggerProps) {
	const { open, menuId, getReferenceProps } = useMenuState()

	const { dismissToTab, rovingKeyDown, triggerRef, setReference } = useMenuActions()

	const { enterSubmenu } = useMenuPointer()

	// The dropdown panel points its `aria-labelledby` at the trigger, so the
	// trigger always has an id. An id of the child or of the consumer stays.
	const fallbackId = useId()

	// Merge the child's own ref (React 19 ref-as-prop) with the floating
	// reference so a consumer can register the trigger element (e.g. as a focus
	// target) rather than have it clobbered. `TooltipTrigger` and
	// `PopoverTrigger` do the same.
	const child = triggerChild(children)

	// A consumer `ref` on the trigger joins the ref of the child.
	const childRef = useComposedRefs<HTMLElement>(
		child?.props.ref,
		ref as Ref<HTMLElement> | undefined,
	)

	// Registration waits for the first open, so a closed menu renders once
	// rather than twice. That almost halves the cost of a closed menu, measured
	// at a fan-out of fifty (`__benchmarks__/browser/menu-mount.bench.tsx`).
	const setTrigger = useDeferredFloatingReference<HTMLElement>(
		setReference,
		open,
		triggerRef,
		childRef,
	)

	// The menu opens once per discrete activation-key press on the trigger. The
	// trigger keeps native timing (Enter fires the button's click on keydown,
	// Space on keyup), but its OS auto-repeat is swallowed, so a held key neither
	// rapidly re-toggles the menu (Enter's per-repeat clicks) nor opens it when the
	// key was already down as focus arrived (released from a HoldButton whose
	// completion moved focus here). A fresh, non-repeat keydown arms; opening then
	// requires letting go and pressing again.
	const activationHeldRef = useRef(false)

	// Focus rests on the trigger while the menu is open, so every navigation key
	// arrives here rather than in the panel. `rovingKeyDown` moves the
	// `aria-activedescendant` cursor over the items (arrow / Home / End /
	// type-ahead) and activates the active row on Enter/Space.
	// Tab closes without `preventDefault`, letting the browser carry focus onward;
	// `dismissToTab` marks the close `'focus-out'` so focus is not yanked back.
	//
	// A closed menu gets none of this. The panel stays mounted for its exit
	// animation, and the row that ran keeps `data-active`, so the roving handler
	// still finds the rows. An Enter in that time would run the row again and
	// cancel the click that opens the menu.
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

		if (!open) return

		// A submenu hovered open under this dropdown owns the arrows while it is
		// up, the same as in a right-click menu. The difference is that focus rests
		// here, so the press arrives on the trigger rather than on the parent row.
		if (enterSubmenu(event.key)) {
			event.preventDefault()

			return
		}

		rovingKeyDown(event)

		if (event.key === 'Tab') dismissToTab(event.nativeEvent)
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
	if (child) {
		const childProps = mergeTriggerProps(props, child.props)

		const childOnKeyDown = childProps.onKeyDown as ((event: KeyboardEvent) => void) | undefined

		const childOnKeyUp = childProps.onKeyUp as ((event: KeyboardEvent) => void) | undefined

		return (
			<TriggerChild
				child={child}
				props={{
					...getReferenceProps({
						...childProps,
						onKeyDown: (event: KeyboardEvent) => {
							childOnKeyDown?.(event)
							handleTriggerKeyDown(event)
						},
						onKeyUp: (event: KeyboardEvent) => {
							childOnKeyUp?.(event)
							handleTriggerKeyUp(event)
						},
					}),
					id: (childProps.id as string | undefined) ?? fallbackId,
					'aria-haspopup': 'menu',
					'aria-expanded': open,
					'aria-controls': open ? menuId : undefined,
					'data-open': dataAttr(open),
					// A child that stamps its own disabled state keeps it.
					'data-disabled': dataAttr(childProps.disabled === true) ?? childProps['data-disabled'],
				}}
				ref={setTrigger}
				slot="menu-trigger"
				className={className}
			/>
		)
	}

	const { onKeyDown: consumerOnKeyDown, onKeyUp: consumerOnKeyUp, ...rest } = props

	return (
		<button
			ref={setTrigger}
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
			data-open={dataAttr(open)}
			data-disabled={dataAttr(rest.disabled)}
		>
			{children}
		</button>
	)
}
