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
 * Canonical props shared by nav-item-style components (NavItem, SidebarItem).
 * Each extends this with its own extras — `value` for selection binding,
 * `size` for an explicit step.
 */
export type NavItemProps = {
	icon?: ReactElement
	current?: boolean
	className?: string
	preventClose?: boolean
	spring?: boolean
	/** Rendered before the inner button, outside it so the slot can host its own interactive element (e.g. a drag handle button). */
	prefix?: ReactNode
	/** Rendered after the inner button, outside it so the slot can host its own interactive element (e.g. an actions button). */
	suffix?: ReactNode
	// `color` conflicts with `<Button>`'s variant union; `ref` differs between anchor/button branches; `prefix` is a string-typed RDFa global we repurpose as a slot.
} & PolymorphicProps<'button', 'color' | 'ref' | 'prefix'>

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
 * Only the wiring lives here; each component owns its own markup so the slot
 * names, classes, and icon sizing stay local and legible.
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

	useLayoutEffect(() => {
		if (isCurrent && ref.current) {
			scrollWithin(ref.current, { block: 'nearest' })
		}
	}, [isCurrent, scrollWithin])

	function handleClick(e: MouseEvent<HTMLElement>) {
		onClick?.(e as MouseEvent<HTMLButtonElement> & MouseEvent<HTMLAnchorElement>)

		if (value !== undefined) {
			context?.onValueChange?.(value)
		}

		if (!preventClose) {
			offcanvas?.close()
		}
	}

	return { ref, current: isCurrent, size: resolvedSize, indicator, handleClick }
}
