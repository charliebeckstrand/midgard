'use client'

import { useComposedRefs } from 'motion/react'
import type { CSSProperties, ReactNode, Ref } from 'react'
import { ariaAttr, cn, dataAttr } from '../../core'
import type { ScaleStep } from '../../core/density'
import { intlMessages } from '../../primitives/intl/intl-messages'
import { useIntl } from '../../primitives/intl/use-intl'
import { PopoverPanel } from '../../primitives/popover'
import { Portal } from '../../primitives/portal'
import type { scale } from '../../recipes/kata/combobox'
import { k } from '../../recipes/kata/combobox'
import { keepInputFocus } from './combobox-utilities'

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
	size?: ScaleStep<typeof scale>
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
 * The combobox menu surface rendered through `Portal`. Owns the
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
	const intl = useIntl()

	// The ref keeps one identity, so the panel attaches and scrolls to the
	// selection one time for each mount. React calls a new callback ref again at
	// each commit.
	const floatingRef = useComposedRefs<HTMLDivElement>(setFloating, scrollToSelected)

	// The portal carries the density scope of the combobox. An explicit `size` is
	// the scope of the `PopoverPanel` inside.
	return (
		// `Portal` mounts the portal only while open, so a closed Combobox keeps no
		// empty portal node in the document.
		<Portal open={open} onExitComplete={flushPending}>
			{/* biome-ignore lint/a11y/noStaticElementInteractions: a press guard, not an interactive control. The input keeps focus and the keyboard model. */}
			<div ref={optionsRef} onMouseDown={keepInputFocus}>
				<div
					ref={floatingRef}
					data-editing={dataAttr(editing)}
					style={floatingStyles}
					className={cn('group/combobox', k.portal)}
					{...getFloatingProps()}
				>
					<PopoverPanel
						density={size}
						open={open}
						// No role: an unnamed `group` adds nothing, and the listbox
						// inside carries the widget role.
						role="none"
						autoFocus={false}
						glass={glass}
						className={cn('relative', k.options)}
						onKeyDown={(event) => {
							if (event.key !== 'Escape') return

							// React commits the close before the document listener runs, so
							// the layer below is on top by then. `preventDefault` tells it
							// that this press is consumed.
							event.preventDefault()

							onClose()
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
						<output className={cn(k.empty)}>{intl.formatMessage(intlMessages.noResults)}</output>
					</PopoverPanel>
				</div>
			</div>
		</Portal>
	)
}
