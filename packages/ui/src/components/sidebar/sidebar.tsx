'use client'

import { type ComponentPropsWithoutRef, type ReactNode, useRef } from 'react'
import { cn } from '../../core'
import { useA11yRoving, useMinWidth } from '../../hooks'
import { ActiveIndicatorScope } from '../../primitives/active-indicator'
import { k } from '../../recipes/kata/sidebar'
import { SidebarMiniContext } from './context'

export type SidebarProps = Omit<ComponentPropsWithoutRef<'nav'>, 'children'> & {
	/**
	 * Collapse to an icon rail on desktop (`lg+`): labels turn `sr-only`,
	 * affixes and item actions hide, and items gain a hover tooltip naming the
	 * label. Below the breakpoint the sidebar keeps its full layout, so the
	 * mobile drawer is unaffected.
	 */
	mini?: boolean
	/**
	 * Render-prop children receive the resolved mini state — true only when
	 * `mini` is set and the viewport is desktop — to branch content between
	 * the two presentations (a logo glyph standing in for the wordmark, say).
	 */
	children?: ReactNode | ((mini: boolean) => ReactNode)
}

/**
 * Affix actions inside items (prefix/suffix buttons and links) join the
 * keyboard model on the cross axis: Left/Right rove through the focused row's
 * controls while the actions stay out of the Tab order.
 */
const rovingRow = {
	rowSelector: '[data-slot="sidebar-item"]',
	actionSelector:
		'[data-slot="sidebar-item-prefix"] :is(button,a[href]):not(:disabled), [data-slot="sidebar-item-suffix"] :is(button,a[href]):not(:disabled)',
}

/**
 * Vertical navigation landmark with a true roving-tabindex keyboard model: the
 * item list is a single Tab stop, Up/Down arrows move focus between items,
 * Left/Right rove into an item's prefix/suffix actions, and the resting stop
 * sits on the current page (`aria-current="page"`), falling back to the first
 * item. Establishes an active-indicator scope.
 */
export function Sidebar({
	'aria-label': ariaLabel = 'Sidebar',
	mini = false,
	className,
	children,
	onKeyDown,
	...props
}: SidebarProps) {
	const ref = useRef<HTMLElement>(null)

	const handleKeyDown = useA11yRoving(ref, {
		itemSelector: '[data-slot="sidebar-item-inner"]:not(:disabled)',
		// Nav is a single Tab stop; the resting position is the current-page item.
		manageTabIndex: true,
		activeSelector: '[aria-current="page"]',
		row: rovingRow,
	})

	// Mini is desktop-only: the recipe's `lg:` scoping handles the CSS collapse,
	// and the same breakpoint resolves the state handed to the render prop and
	// to items (which mount their label tooltips off it).
	const desktop = useMinWidth(1024)

	const resolvedMini = mini && desktop

	return (
		<ActiveIndicatorScope>
			<SidebarMiniContext value={resolvedMini}>
				<nav
					ref={ref}
					data-slot="sidebar"
					data-mini={mini || undefined}
					aria-label={ariaLabel}
					className={cn(k.base, className)}
					onKeyDown={(e) => {
						handleKeyDown(e)
						onKeyDown?.(e)
					}}
					{...props}
				>
					{typeof children === 'function' ? children(resolvedMini) : children}
				</nav>
			</SidebarMiniContext>
		</ActiveIndicatorScope>
	)
}
