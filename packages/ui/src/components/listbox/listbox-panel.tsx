'use client'

import { FloatingFocusManager, type FloatingRootContext } from '@floating-ui/react'
import {
	type CSSProperties,
	type HTMLProps,
	type KeyboardEventHandler,
	type ReactNode,
	useRef,
} from 'react'
import { cn } from '../../core'
import type { ScaleStep } from '../../core/density'
import { PopoverPanel } from '../../primitives/popover'
import { Portal } from '../../primitives/portal'
import type { scale } from '../../recipes/kata/listbox'
import { k } from '../../recipes/kata/listbox'

type ListboxPanelProps = {
	id: string
	open: boolean
	glass: boolean
	multiple: boolean
	/**
	 * The density step of the listbox. Omit it to take the step of the nearest
	 * density scope of the listbox, which the portal carries. A step makes the
	 * panel a density scope.
	 */
	size?: ScaleStep<typeof scale>
	/** Accessible name for the listbox, threaded from the trigger's name. */
	ariaLabel?: string
	ariaLabelledby?: string
	floatingStyles: CSSProperties
	context: FloatingRootContext
	getFloatingProps: (userProps?: HTMLProps<HTMLElement>) => Record<string, unknown>
	setFloating: (node: HTMLElement | null) => void
	flushPending: () => void
	/** Tab keydown anywhere in the panel: close and carry focus past the trigger. */
	onTabOut: KeyboardEventHandler<HTMLElement>
	children: ReactNode
}

/**
 * Internal: the listbox menu surface rendered through `Portal`.
 * Owns the entry/exit animation and the listbox role; the caller supplies
 * floating positioning and open state.
 *
 * Not exported from the package barrel.
 */
export function ListboxPanel({
	id,
	open,
	glass,
	multiple,
	size,
	ariaLabel,
	ariaLabelledby,
	floatingStyles,
	context,
	getFloatingProps,
	setFloating,
	flushPending,
	onTabOut,
	children,
}: ListboxPanelProps) {
	// The element `FloatingFocusManager` lands focus on when the panel opens:
	// the selected option (arrow keys resume from the current value), else the
	// listbox itself. Populated in the floating node's ref callback, which
	// fires after the option children commit; the manager then reads it before
	// running its initial-focus effect.
	const initialFocusRef = useRef<HTMLElement | null>(null)

	// The portal carries the density scope of the listbox. An explicit `size` is
	// the scope of the `PopoverPanel` inside.
	return (
		// `Portal` mounts the portal only while open, so a closed Select keeps
		// no empty portal node in the document.
		<Portal open={open} onExitComplete={flushPending}>
			{/* Non-modal: focus moves into the panel on open and stays contained. Tab
			    exits through `onTabOut`: it commits at the option, closes, and carries
			    focus past the trigger. A select closes on Tab and does not trap focus.
			    `closeOnFocusOut` dismisses on any other focus departure. The
			    `returnFocusTo` of `useFloatingUI` restores focus, so `returnFocus={false}`
			    turns off the restore of the manager. */}
			<FloatingFocusManager
				context={context}
				modal={false}
				initialFocus={initialFocusRef}
				returnFocus={false}
			>
				<div
					ref={(node) => {
						setFloating(node)

						initialFocusRef.current =
							node?.querySelector<HTMLElement>('[role="option"][data-selected]') ??
							node?.querySelector<HTMLElement>('[data-slot="popover-panel"]') ??
							node
					}}
					style={floatingStyles}
					className={k.portal}
					tabIndex={-1}
					{...getFloatingProps({ onKeyDown: onTabOut })}
				>
					<PopoverPanel
						density={size}
						id={id}
						role="listbox"
						aria-label={ariaLabel}
						aria-labelledby={ariaLabelledby}
						multiselectable={multiple || undefined}
						typeahead
						glass={glass}
						className={cn(k.panel, k.options)}
					>
						{children}
					</PopoverPanel>
				</div>
			</FloatingFocusManager>
		</Portal>
	)
}
