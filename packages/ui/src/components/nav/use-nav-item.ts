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
import { useCurrent } from '../../primitives/current'
import { useDensity } from '../../primitives/density'
import { OffcanvasContext } from '../../primitives/offcanvas'
import type { PolymorphicProps } from '../../primitives/polymorphic'
import type { Step } from '../../recipes'

/**
 * Canonical props shared by nav-item-style components ({@link NavItem},
 * `SidebarItem`). Each extends this with its own extras: {@link NavMenuItemProps}
 * adds `value` for selection binding, `SidebarItemProps` adds `size`.
 *
 * @see {@link useNavItem} for the behavior these props drive.
 */
export type NavItemProps = {
	icon?: ReactElement
	current?: boolean
	className?: string
	/** Keep an enclosing offcanvas drawer open on click instead of dismissing it. */
	preventClose?: boolean
	/**
	 * Enable the press-spring tap animation on the active indicator.
	 * @defaultValue `false`
	 */
	spring?: boolean
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
	size?: Step
	preventClose?: boolean
	onClick?: NavItemProps['onClick']
}

/**
 * Shared behavior for nav-item components. Resolves the current state (explicit
 * `current` prop, or selection binding via `value`), scrolls the active item
 * into view, resolves the size against Density, and composes the click handler
 * (user `onClick` + selection change + offcanvas close).
 *
 * Only the wiring lives here; each consuming component owns its own markup,
 * slot names, classes, and icon sizing.
 *
 * @returns The scroll-target `ref`, resolved `current` and `size`, the active
 * indicator handle, and the composed `handleClick`.
 */
export function useNavItem({ current, value, size, preventClose, onClick }: NavItemOptions) {
	const ref = useRef<HTMLSpanElement>(null)

	const indicator = useActiveIndicator()
	const inherited = useDensity()
	const offcanvas = use(OffcanvasContext)
	const context = useCurrent()
	const scrollWithin = useScrollWithin()

	const resolvedSize = size ?? inherited.size

	const isCurrent = current ?? (value !== undefined && context?.value === value)

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
			context?.onValueChange?.(value)
		}

		if (!preventClose) {
			offcanvas?.close()
		}
	}

	return { ref, current: isCurrent, size: resolvedSize, indicator, handleClick }
}
