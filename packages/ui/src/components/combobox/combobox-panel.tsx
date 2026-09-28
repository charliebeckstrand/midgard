'use client'

import { FloatingPortal } from '@floating-ui/react'
import { AnimatePresence } from 'motion/react'
import type { CSSProperties, ReactNode, Ref } from 'react'
import { ariaAttr, cn, dataAttr } from '../../core'
import type { DensityStep } from '../../core/density'
import { useDensityScope } from '../../primitives/density'
import { PopoverPanel } from '../../primitives/popover'
import { usePortalContainer } from '../../primitives/portal'
import { k } from '../../recipes/kata/combobox'

type ComboboxPanelProps = {
	id: string
	open: boolean
	editing: boolean
	multiple: boolean
	glass: boolean
	/**
	 * The density step of the combobox. Omit it to take the step of the nearest
	 * density scope of the combobox, which the portal carries. A step makes the
	 * panel a density scope.
	 */
	size?: DensityStep
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

	// A portal takes the panel out of the DOM subtree of its scope, so the root
	// writes the step of the scope that opened it, as `FloatingSurface` does. An
	// explicit `size` is the scope of the `PopoverPanel` inside.
	const inherited = useDensityScope()

	return (
		<FloatingPortal root={root ?? undefined}>
			<div ref={optionsRef} data-density={inherited ?? undefined}>
				<AnimatePresence onExitComplete={flushPending}>
					{open && (
						<div
							ref={(node) => {
								setFloating(node)

								scrollToSelected(node)
							}}
							data-editing={dataAttr(editing)}
							style={floatingStyles}
							className={cn('group/combobox', k.portal)}
							{...getFloatingProps()}
						>
							<PopoverPanel
								density={size}
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
									aria-multiselectable={ariaAttr(multiple)}
									className={cn(k.list)}
								>
									{children}
								</div>
								<output className={cn(k.empty)}>No results</output>
							</PopoverPanel>
						</div>
					)}
				</AnimatePresence>
			</div>
		</FloatingPortal>
	)
}
