'use client'

import { useComposedRefs } from 'motion/react'
import type { ComponentProps, MouseEventHandler, ReactNode, Ref } from 'react'
import { composeEventHandlers, dataAttr } from '../../core'
import { mergeTriggerProps, TriggerChild, triggerChild } from '../trigger-child/trigger-child'
import { usePanelState } from './panel-root'

/**
 * Props for {@link PanelTrigger}. The `<button>` of the trigger takes the rest.
 * With a single element child, the clone of the child takes the rest instead.
 */
export type PanelTriggerProps = ComponentProps<'button'> & {
	/**
	 * What opens the panel. A single element is cloned, so it keeps its own
	 * `onClick` and ARIA. Anything else renders inside the trigger's own
	 * `<button>`, as `PopoverTrigger` does with its child.
	 */
	children: ReactNode
}

/**
 * A trigger that opens the panel of the enclosing Dialog, Sheet, or Drawer root.
 * A single element child is cloned, and a click on it opens the panel after the
 * child's own `onClick`. Anything else renders inside the trigger's own `<button>`.
 * Either way the trigger carries `aria-haspopup="dialog"`, `aria-expanded`, and,
 * while the panel is open, `aria-controls`. The other props of the trigger go
 * to a cloned child. The props of the child win a clash, and a handler on both
 * runs the two. The trigger stamps `data-open` while the panel is open, and
 * `data-disabled` while it is disabled.
 *
 * The trigger writes `data-slot="panel-trigger"` only on its own `<button>` or
 * on a host element child that has no `data-slot` of its own.
 *
 * @remarks The trigger reads the open state with {@link usePanelState}, so it
 * must be inside the root. A trigger outside the root throws.
 */
export function PanelTrigger({ children, ref, onClick, ...props }: PanelTriggerProps) {
	const { open, setOpen, panelId } = usePanelState()

	const handleClick = () => setOpen(true)

	const controls = open ? panelId : undefined

	const child = triggerChild(children)

	// A consumer `ref` on the trigger joins the ref of the child.
	const childRef = useComposedRefs<HTMLElement>(
		child?.props.ref,
		ref as Ref<HTMLElement> | undefined,
	)

	if (child) {
		const childProps = mergeTriggerProps({ ...props, onClick }, child.props)

		return (
			<TriggerChild
				child={child}
				props={{
					...childProps,
					onClick: composeEventHandlers(
						childProps.onClick as MouseEventHandler | undefined,
						handleClick,
						{
							checkForDefaultPrevented: false,
						},
					),
					'aria-haspopup': childProps['aria-haspopup'] ?? 'dialog',
					'aria-expanded': childProps['aria-expanded'] ?? open,
					'aria-controls': controls,
					'data-open': dataAttr(open),
					// A child that stamps its own disabled state keeps it.
					'data-disabled': dataAttr(childProps.disabled === true) ?? childProps['data-disabled'],
				}}
				ref={childRef}
				slot="panel-trigger"
			/>
		)
	}

	return (
		<button
			data-slot="panel-trigger"
			{...props}
			ref={ref}
			type="button"
			// The open is the activation of the trigger, so a consumer's
			// preventDefault() does not cancel it (CONVENTIONS.md §3.9).
			onClick={composeEventHandlers(onClick, handleClick, { checkForDefaultPrevented: false })}
			aria-haspopup="dialog"
			aria-expanded={open}
			aria-controls={controls}
			data-open={dataAttr(open)}
			data-disabled={dataAttr(props.disabled)}
		>
			{children}
		</button>
	)
}
