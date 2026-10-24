'use client'

import { useComposedRefs } from 'motion/react'
import { type AriaRole, type ComponentProps, type ReactNode, useLayoutEffect, useRef } from 'react'
import { cn, composeEventHandlers, dataAttr } from '../../core'
import type { DensityStep } from '../../core/density'
import { useA11yRoving, useScrollWithin, type VirtualItemSource } from '../../hooks'
import { k } from '../../recipes/kata/popover'
import { Density } from '../density'
import { ReducedMotion } from '../reduced-motion'
import * as m from '../reduced-motion/reduced-motion-elements'
import { VirtualItemSourceContext } from '../virtual-options/context'

/**
 * Props for {@link PopoverPanel}. The panel `<m.div>` takes the rest, except the
 * keys that Motion gives its own meaning (as in `CurrentContent`) and the keys
 * that the panel owns: its tab stop and `aria-multiselectable`.
 */
export type PopoverPanelProps = Omit<
	ComponentProps<'div'>,
	| 'role'
	| 'tabIndex'
	| 'aria-multiselectable'
	| 'onDrag'
	| 'onDragStart'
	| 'onDragEnd'
	| 'onAnimationStart'
> & {
	children: ReactNode
	/**
	 * ARIA role for the panel. Override the `listbox` default for menus and
	 * the like. Set `'none'` for a panel that only holds a widget with its own
	 * role, such as the listbox of a Combobox. The panel then renders no role
	 * attribute: it is focusable (`tabIndex={-1}`), and a browser ignores
	 * `role="none"` on a focusable element.
	 *
	 * @defaultValue 'listbox'
	 */
	role?: AriaRole
	/**
	 * CSS selector matching the navigable option rows.
	 *
	 * @defaultValue '[role="option"]:not([data-disabled])'
	 */
	itemSelector?: string
	/**
	 * Move focus into the panel on open: onto the selected option, or the
	 * panel container when none is selected.
	 *
	 * @defaultValue true
	 */
	autoFocus?: boolean
	/**
	 * Enable WAI-ARIA type-ahead: jump to the item whose label matches typed keys.
	 *
	 * @defaultValue false
	 */
	typeahead?: boolean
	/**
	 * Hold Tab inside the panel: Tab / Shift+Tab step through the rows and wrap
	 * at the ends rather than carrying focus to whatever follows the portal.
	 * For a panel the user leaves by dismissing it, such as a menu closed with
	 * `Escape` or a selection. Not for one whose owner keeps focus and expects Tab
	 * to exit.
	 *
	 * @defaultValue false
	 */
	trapTab?: boolean
	/**
	 * Make the panel one Tab stop. The panel sets `tabIndex=0` on one row and
	 * `tabIndex=-1` on the other rows, and moves the `0` to the row that gets
	 * focus. Use it for a panel that stays in the page, such as a `static` menu,
	 * where Tab must reach a row.
	 *
	 * @defaultValue false
	 */
	manageTabIndex?: boolean
	/**
	 * Apply glass surface chrome instead of the default popover surface.
	 *
	 * @remarks Items inside take the deeper glass wash on hover and focus.
	 *
	 * @defaultValue false
	 */
	glass?: boolean
	/**
	 * Sets `aria-multiselectable` on a `role="listbox"` panel that allows multiple selections.
	 * @defaultValue false
	 */
	multiselectable?: boolean
	/**
	 * The density step. Omit it to take the step of the nearest density scope.
	 * A step makes the panel a density scope: it writes `data-density` and opens
	 * the density context around the rows. A portaled panel is not in the DOM
	 * subtree of its trigger, so it opens its own scope.
	 */
	density?: DensityStep
	/**
	 * The open state of the owner, such as a menu or a listbox. The panel stamps
	 * `data-open` while it is `true`. Omit it for a panel that has no open state,
	 * such as a `static` menu.
	 *
	 * @defaultValue No open state: the panel stamps no `data-open`.
	 */
	open?: boolean
}

/**
 * Animated listbox-style panel for floating dropdowns (Select, Combobox,
 * Menu). Wires up roving keyboard navigation, optional type-ahead and Tab
 * containment, and autofocus on open. Autofocus lands on the selected item, or
 * on the panel itself when nothing is selected. A `VirtualOptions` with
 * `getOptionId` inside registers its item source here, so the keys reach
 * options outside the rendered window.
 *
 * @remarks Defaults to `role="listbox"`; override `role` for menus and the
 * like. `role="none"` renders no role attribute. `aria-multiselectable` is honored
 * only on listbox roles. Pass `glass` for the translucent surface variant.
 * Pass `open` from the owner, and the panel stamps `data-open` while it is open.
 */
export function PopoverPanel({
	className,
	children,
	role = 'listbox',
	itemSelector = '[role="option"]:not([data-disabled])',
	autoFocus = true,
	typeahead = false,
	trapTab = false,
	manageTabIndex = false,
	glass = false,
	multiselectable,
	density,
	open,
	onKeyDown: onKeyDownProp,
	ref,
	...props
}: PopoverPanelProps) {
	const panelRef = useRef<HTMLDivElement>(null)

	// The autofocus and the roving read the node, so a consumer `ref` joins it.
	const setPanel = useComposedRefs(panelRef, ref)

	// Registered by a `VirtualOptions` (with `getOptionId`) inside `children`;
	// null otherwise, which keeps the DOM-query roving.
	const virtualSourceRef = useRef<VirtualItemSource | null>(null)

	const handleKeyDown = useA11yRoving(panelRef, {
		itemSelector,
		focusOnEmpty: true,
		typeahead,
		trapTab,
		manageTabIndex,
		itemSource: virtualSourceRef,
	})

	const scrollWithin = useScrollWithin()

	useLayoutEffect(() => {
		if (!autoFocus || !panelRef.current) return

		// `:is()` applies the attribute to each selector in a list such as
		// `'a, button'`. A bare suffix applies only to the last one.
		const selected = panelRef.current.querySelector<HTMLElement>(
			`:is(${itemSelector})[data-selected]`,
		)

		// The focus scrolls nothing. The panel mounts at the origin of its wrapper and
		// Floating UI places it a microtask later, so a focus that scrolled would take
		// the page to the top. The scroll to the selected item stays within the panel.
		if (selected) {
			selected.focus({ preventScroll: true })

			scrollWithin(selected, { block: 'nearest' })
		} else {
			panelRef.current.focus({ preventScroll: true })
		}
	}, [autoFocus, itemSelector, scrollWithin])

	return (
		<ReducedMotion>
			<m.div
				{...props}
				ref={setPanel}
				// After the spread: `ListboxPanel` finds the panel by this anchor
				// (CONVENTIONS.md §3.9).
				data-slot="popover-panel"
				// Half the marker `hannou.tint.glass` keys on; the `group/glass` class
				// of the glass surface is the other half. See `recipes/kiso/hannou/glass-item.ts`.
				data-glass={dataAttr(glass)}
				data-density={density}
				data-open={dataAttr(open)}
				role={role === 'none' ? undefined : role}
				// ARIA allows `aria-multiselectable` on listbox and grid roles; this
				// panel only sets it on the listbox role.
				aria-multiselectable={role === 'listbox' ? multiselectable : undefined}
				tabIndex={-1}
				{...k.motion}
				// Roving is a keyboard model no consumer switches off, so a consumer's
				// preventDefault() does not cancel it (CONVENTIONS.md §3.9).
				onKeyDown={composeEventHandlers(onKeyDownProp, handleKeyDown, {
					checkForDefaultPrevented: false,
				})}
				className={cn(k({ surface: glass ? 'glass' : 'flat' }).base, className)}
			>
				<Density step={density}>
					<VirtualItemSourceContext value={virtualSourceRef}>{children}</VirtualItemSourceContext>
				</Density>
			</m.div>
		</ReducedMotion>
	)
}
