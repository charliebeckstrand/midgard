'use client'

import { FloatingPortal } from '@floating-ui/react'
import { AnimatePresence } from 'motion/react'
import type { CSSProperties, ReactNode } from 'react'
import { cn } from '../../core'
import { Density } from '../../primitives/density'
import { PopoverPanel } from '../../primitives/popover'
import { popover as kPopover } from '../../recipes/genkei/popover'
import { k } from '../../recipes/kata/listbox'
import type { ControlSize } from '../control/context'

export type ListboxPanelProps = {
	id: string
	open: boolean
	glass: boolean
	density: ControlSize
	size: ControlSize
	floatingStyles: CSSProperties
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
	density,
	size,
	floatingStyles,
	getFloatingProps,
	setFloating,
	flushPending,
	children,
}: ListboxPanelProps) {
	return (
		<FloatingPortal>
			<AnimatePresence onExitComplete={flushPending}>
				{open && (
					<div
						ref={setFloating}
						style={floatingStyles}
						className={kPopover.portal}
						{...getFloatingProps()}
					>
						<Density density={density} size={size}>
							<PopoverPanel id={id} role="listbox" glass={glass} className={cn(k.panel, k.options)}>
								{children}
							</PopoverPanel>
						</Density>
					</div>
				)}
			</AnimatePresence>
		</FloatingPortal>
	)
}
