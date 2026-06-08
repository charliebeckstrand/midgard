'use client'

import { FloatingFocusManager, FloatingPortal, type FloatingRootContext } from '@floating-ui/react'
import { AnimatePresence } from 'motion/react'
import { type CSSProperties, type ReactNode, useRef } from 'react'
import { cn } from '../../core'
import { Density } from '../../primitives/density'
import { PopoverPanel } from '../../primitives/popover'
import { usePortalContainer } from '../../primitives/portal'
import { k } from '../../recipes/kata/listbox'
import type { ControlSize } from '../control/context'

type ListboxPanelProps = {
	id: string
	open: boolean
	glass: boolean
	multiple: boolean
	density: ControlSize
	size: ControlSize
	/** Accessible name for the listbox, threaded from the trigger's name. */
	ariaLabel?: string
	ariaLabelledby?: string
	floatingStyles: CSSProperties
	context: FloatingRootContext
	getFloatingProps: () => Record<string, unknown>
	setFloating: (node: HTMLElement | null) => void
	flushPending: () => void
	children: ReactNode
}

/**
 * Internal — the listbox menu surface rendered through FloatingPortal.
 * Owns the entry/exit animation and the listbox role; floating positioning
 * + open state is supplied by the caller.
 *
 * Not exported from the package barrel — intentionally internal.
 */
export function ListboxPanel({
	id,
	open,
	glass,
	multiple,
	density,
	size,
	ariaLabel,
	ariaLabelledby,
	floatingStyles,
	context,
	getFloatingProps,
	setFloating,
	flushPending,
	children,
}: ListboxPanelProps) {
	const root = usePortalContainer()

	// The element `FloatingFocusManager` lands focus on when the panel opens:
	// the selected option (so arrow-keys resume from the current value), else the
	// listbox itself. Populated in the floating node's ref callback — which fires
	// after the option children have committed — so the manager reads it before
	// running its initial-focus effect.
	const initialFocusRef = useRef<HTMLElement | null>(null)

	return (
		<FloatingPortal root={root ?? undefined}>
			<AnimatePresence onExitComplete={flushPending}>
				{open && (
					// Non-modal: focus moves into the panel on open and is contained, so
					// Tab leaves the surface through the focus guards and `closeOnFocusOut`
					// dismisses it (a select closes on Tab; it doesn't trap like a dialog).
					// Return-focus stays with `useFloatingUI`'s `returnFocusTo`, hence
					// `returnFocus={false}` here.
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
							{...getFloatingProps()}
						>
							<Density space={density} size={size}>
								<PopoverPanel
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
							</Density>
						</div>
					</FloatingFocusManager>
				)}
			</AnimatePresence>
		</FloatingPortal>
	)
}
