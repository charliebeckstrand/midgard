'use client'

import { FloatingPortal } from '@floating-ui/react'
import { AnimatePresence } from 'motion/react'
import type { CSSProperties, ReactNode, Ref } from 'react'
import { cn } from '../../core'
import { Density } from '../../primitives/density'
import { PopoverPanel } from '../../primitives/popover'
import { k } from '../../recipes/kata/combobox'
import type { ControlSize } from '../control/context'

type ComboboxPanelProps = {
	id: string
	open: boolean
	editing: boolean
	glass: boolean
	density: ControlSize
	size: ControlSize
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
 * Internal — the combobox menu surface rendered through FloatingPortal.
 * Owns the entry/exit animation, the listbox role, and the Escape-to-close
 * handler; floating positioning + open state is supplied by the caller.
 *
 * Not exported from the package barrel — intentionally internal.
 */
export function ComboboxPanel({
	id,
	open,
	editing,
	glass,
	density,
	size,
	floatingStyles,
	getFloatingProps,
	optionsRef,
	setFloating,
	scrollToSelected,
	flushPending,
	onClose,
	children,
}: ComboboxPanelProps) {
	return (
		<FloatingPortal>
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
							<Density density={density} size={size}>
								<PopoverPanel
									role="group"
									autoFocus={false}
									glass={glass}
									className={cn('relative', k.options)}
									onKeyDown={(e) => {
										if (e.key === 'Escape') onClose()
									}}
								>
									{/* The listbox owns only options, per aria-required-children. The
									    empty-state status message is a sibling inside the panel chrome,
									    so it still announces and still renders on the dropdown surface;
									    a peer/:empty toggle swaps the two as options come and go. */}
									<div role="listbox" id={id} className={cn(k.list)}>
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
