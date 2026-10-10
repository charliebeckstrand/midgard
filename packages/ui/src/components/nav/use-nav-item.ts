'use client'

import {
	type MouseEvent,
	type ReactElement,
	type ReactNode,
	use,
	useLayoutEffect,
	useRef,
} from 'react'
import { useScrollWithin } from '../../hooks'
import { useActiveIndicator } from '../../primitives/active-indicator'
import { useCurrentItem } from '../../primitives/current/current'
import { type PathMatch, usePathMatch } from '../../primitives/current/current-pathname'
import { OffcanvasContext } from '../../primitives/offcanvas'
import type { PolymorphicProps } from '../../primitives/polymorphic'

/**
 * Canonical props shared by nav-item-style components ({@link NavItem},
 * `SidebarItem`). Each extends this with its own extras: {@link NavMenuItemProps}
 * adds `value` for selection binding, `SidebarItemProps` adds `size`.
 *
 * @see {@link useNavItem} for the behavior these props drive.
 */
export type NavItemProps = {
	/** Icon before the label. It takes the size of the density step of the item. */
	icon?: ReactElement
	/**
	 * Marks the item as current: the item takes `aria-current` and shows the
	 * active indicator. Omit it to let an item with a `value` read the state from
	 * the enclosing selection, or an item with an `href` read it from the
	 * `pathname` of `UIProvider`.
	 *
	 * @defaultValue `false`, or `true` when an `href` matches the `pathname` of `UIProvider` or a `value` matches the enclosing selection.
	 */
	current?: boolean
	/**
	 * How the `href` matches the `pathname` of `UIProvider`: `exact`, or `prefix`
	 * to stay current on each path under the `href`, as a section root does.
	 * @defaultValue 'exact'
	 */
	match?: PathMatch
	/** Classes for the inner button or link. The wrapper of the row does not take them. */
	className?: string
	/**
	 * Keep an enclosing offcanvas drawer open on click instead of dismissing it.
	 * @defaultValue false
	 */
	preventClose?: boolean
	/** Rendered before the inner button, outside it; the slot can host its own interactive element (e.g. a drag handle button). Slot controls auto-step one size down; an explicit `size` prop overrides. */
	prefix?: ReactNode
	/** Rendered after the inner button, outside it; the slot can host its own interactive element (e.g. an actions button). Slot controls auto-step one size down; an explicit `size` prop overrides. */
	suffix?: ReactNode
	// `color` conflicts with `<Button>`'s variant union; `ref` differs between anchor/button branches; `prefix` is a string-typed RDFa global we repurpose as a slot.
} & PolymorphicProps<'button', 'color' | 'ref' | 'prefix'>

/**
 * Inputs to {@link useNavItem}.
 *
 * @internal
 */
type NavItemOptions = {
	current?: boolean
	/** Binds to the surrounding selection context; when set, click reports it and `current` resolves against it. */
	value?: string
	/** The link of the item. Without `current` or `value`, `current` resolves against the `pathname` of `UIProvider`. */
	href?: string
	match?: PathMatch
	preventClose?: boolean
	onClick?: NavItemProps['onClick']
}

/**
 * Shared behavior for nav-item components. Resolves the current state from an
 * explicit `current` prop, from the selection binding via `value`, or from the
 * path binding via `href`. It also
 * scrolls the active item into view. It composes the click handler from the user `onClick`, the selection change, and
 * the offcanvas close.
 *
 * Only the wiring lives here; each consuming component owns its own markup,
 * slot names, classes, and icon sizing.
 *
 * @returns The scroll-target `ref`, resolved `current`, the active
 * indicator handle, and the composed `handleClick`.
 */
export function useNavItem({ current, value, href, match, preventClose, onClick }: NavItemOptions) {
	const ref = useRef<HTMLSpanElement>(null)

	const indicator = useActiveIndicator()
	const offcanvas = use(OffcanvasContext)
	// The item reads its own value, so a change renders only the item that stops
	// being current and the item that becomes current.
	const item = useCurrentItem(value)
	// The item reads its own `href`, so a navigation renders only the items whose
	// match changes.
	const onPath = usePathMatch(href, match)
	const scrollWithin = useScrollWithin()

	const isCurrent = current ?? (value === undefined ? onPath : item.current)

	// Scroll once per becoming-current edge, tracked in a ref. The effect also
	// re-fires without an edge: StrictMode's dev double-invoke replays layout
	// effects for fibers that merely moved (keyed list reorders), and scrolling
	// there yanks the scroller to the current item. The ref persists through
	// those replays but resets on a true remount, keeping deep-link scroll.
	const scrolledRef = useRef(false)

	useLayoutEffect(() => {
		if (!isCurrent) {
			scrolledRef.current = false

			return
		}

		if (scrolledRef.current || !ref.current) return

		scrolledRef.current = true

		scrollWithin(ref.current, { block: 'nearest' })
	}, [isCurrent, scrollWithin])

	function handleClick(event: MouseEvent<HTMLElement>) {
		onClick?.(event as MouseEvent<HTMLButtonElement> & MouseEvent<HTMLAnchorElement>)

		if (value !== undefined) {
			item.onValueChange?.(value)
		}

		if (!preventClose) {
			offcanvas?.close()
		}
	}

	return { ref, current: isCurrent, indicator, handleClick }
}
