'use client'

import { FloatingPortal } from '@floating-ui/react'
import { AnimatePresence } from 'motion/react'
import type { CSSProperties, ReactNode, Ref } from 'react'
import { cn } from '../../core'
import { Density } from '../../primitives/density'
import { PopoverPanel } from '../../primitives/popover'
import { usePortalContainer } from '../../primitives/portal'
import { k } from '../../recipes/kata/combobox'
import type { ControlSize } from '../control/context'

type ComboboxPanelProps = {
	id: string
	open: boolean
	editing: boolean
	multiple: boolean
	glass: boolean
	density: ControlSize
	size: ControlSize
	/** Accessible name for the listbox, threaded from the combobox input's name. */
	ariaLabel?: string
	ariaLabelledby?: string
	floatingStyles: CSSProperties
	getFloatingProps: () => Record<string, unknown>
	optionsRef: Ref<HTMLDivElement>
	setFloating: (node: HTMLElement | null) => void
	scrollToSelected: (node: HTMLDivElement | null) => void
	flushPending: () => void
	onClose: () => void
	children: ReactNode
}

/**
 * The combobox menu surface rendered through `FloatingPortal`. Owns the
 * entry/exit animation, the listbox role, and the Escape-to-close handler;
 * the caller supplies floating positioning and open state.
 *
 * @remarks The listbox holds only options (`aria-required-children`); the
 * "No results" status is a sibling toggled by a `peer/:empty` rule.
 * `flushPending` runs on exit-complete so the deferred selection commits after
 * the close animation.
 * @internal
 */
export function ComboboxPanel({
	id,
	open,
	editing,
	multiple,
	glass,
	density,
	size,
	ariaLabel,
	ariaLabelledby,
	floatingStyles,
	getFloatingProps,
	optionsRef,
	setFloating,
	scrollToSelected,
	flushPending,
	onClose,
	children,
}: ComboboxPanelProps) {
	const root = usePortalContainer()

	return (
		<FloatingPortal root={root ?? undefined}>
			<div ref={optionsRef}>
				<AnimatePresence onExitComplete={flushPending}>
					{open && (
						<div
							ref={(node) => {
								setFloating(node)

								scrollToSelected(node)
							}}
							data-editing={editing || undefined}
							style={floatingStyles}
							className={cn('group/combobox', k.portal)}
							{...getFloatingProps()}
						>
							<Density space={density} size={size}>
								<PopoverPanel
									role="group"
									autoFocus={false}
									glass={glass}
									className={cn('relative', k.options)}
									onKeyDown={(event) => {
										if (event.key === 'Escape') onClose()
									}}
								>
									{/* The listbox owns only options, per aria-required-children. The
									    empty-state status message is a sibling inside the panel chrome;
									    it announces and renders on the dropdown surface. A peer/:empty
									    toggle swaps the two as options come and go. */}
									<div
										role="listbox"
										id={id}
										aria-label={ariaLabel}
										aria-labelledby={ariaLabel ? undefined : ariaLabelledby}
										aria-multiselectable={multiple || undefined}
										className={cn(k.list)}
									>
										{children}
									</div>
									<output className={cn(k.empty)}>No results</output>
								</PopoverPanel>
							</Density>
						</div>
					)}
				</AnimatePresence>
			</div>
		</FloatingPortal>
	)
}
