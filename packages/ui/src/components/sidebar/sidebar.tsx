'use client'

import { type ComponentProps, useRef } from 'react'
import { cn, composeEventHandlers, dataAttr } from '../../core'
import { useA11yRoving, useComposedRef, useMinBreakpoint } from '../../hooks'
import { ActiveIndicatorScope } from '../../primitives/active-indicator'
import { k } from '../../recipes/kata/sidebar'
import { SidebarMiniContext } from './context'

/** Props for {@link Sidebar}: the `mini` rail toggle plus native `<nav>` attributes. */
export type SidebarProps = ComponentProps<'nav'> & {
	/**
	 * Collapse to an icon rail on desktop (`lg+`): labels turn `sr-only`,
	 * affixes and item actions hide, and items gain a hover tooltip naming the
	 * label. Below the breakpoint the sidebar keeps its full layout, so the
	 * mobile drawer is unaffected.
	 * @defaultValue `false`
	 */
	mini?: boolean
}

/**
 * Vertical navigation landmark with a true roving-tabindex keyboard model. The
 * item list is a single Tab stop, Up/Down arrows move focus between items, and
 * Left/Right rove into an item's prefix/suffix actions. The resting stop
 * sits on the current page (`aria-current="page"`), falling back to the first
 * item. Establishes an active-indicator scope.
 *
 * @remarks
 * Content that has to differ between the full sidebar and the mini rail reads
 * the resolved state with {@link useSidebarMini}, from a component inside the
 * sidebar. The root took a render prop for that once, and it was the library's
 * one root render prop. The context it already broadcasts does the same work
 * without one.
 */
export function Sidebar({
	'aria-label': ariaLabel = 'Sidebar',
	mini = false,
	className,
	children,
	onKeyDown,
	ref: consumerRef,
	...props
}: SidebarProps) {
	const ref = useRef<HTMLElement>(null)

	// A consumer ref joins the roving ref instead of replacing it (CONVENTIONS.md §3.9).
	const composedRef = useComposedRef(ref, consumerRef)

	const handleKeyDown = useA11yRoving(ref, {
		itemSelector: '[data-slot="sidebar-item-inner"]:not(:disabled)',
		// Nav is a single Tab stop; the resting position is the current-page item.
		manageTabIndex: true,
		activeSelector: '[aria-current="page"]',
		/**
		 * Affix actions inside items (prefix/suffix buttons and links) join the
		 * keyboard model on the cross axis. Left/Right rove through the focused row's
		 * controls, while the actions stay out of the Tab order.
		 */
		row: {
			rowSelector: '[data-slot="sidebar-item"]',
			actionSelector:
				'[data-slot="sidebar-item-prefix"] :is(button,a[href]):not(:disabled), [data-slot="sidebar-item-suffix"] :is(button,a[href]):not(:disabled)',
		},
	})

	// Mini is desktop-only: the recipe's `lg:` scoping handles the CSS collapse,
	// and the same breakpoint resolves the state handed to the render prop and
	// to items (which mount their label tooltips off it).
	const desktop = useMinBreakpoint('lg')

	const resolvedMini = mini && desktop

	return (
		<ActiveIndicatorScope>
			<SidebarMiniContext value={resolvedMini}>
				<nav
					ref={composedRef}
					data-slot="sidebar"
					data-mini={dataAttr(mini)}
					aria-label={ariaLabel}
					className={cn(k.base, className)}
					// Roving is a keyboard model no consumer switches off, so a consumer's
					// preventDefault() does not cancel it (CONVENTIONS.md §3.9).
					onKeyDown={composeEventHandlers(onKeyDown, handleKeyDown, {
						checkForDefaultPrevented: false,
					})}
					{...props}
				>
					{children}
				</nav>
			</SidebarMiniContext>
		</ActiveIndicatorScope>
	)
}
