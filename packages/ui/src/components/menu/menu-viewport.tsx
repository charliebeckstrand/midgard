'use client'

import type { ReactNode, Ref } from 'react'
import { useComposedRef, useScrollOverflow } from '../../hooks'
import { useDensity } from '../../primitives/density'
import { k } from '../../recipes/kata/menu'
import { useMenuCapped } from './context'

/** Props for {@link MenuViewport}. */
type MenuViewportProps = {
	/**
	 * A ref the panel needs on the same node, composed with the overflow watch.
	 * {@link MenuSub} passes the state setter its focus-seating effect reads.
	 */
	ref?: Ref<HTMLElement>
	children: ReactNode
}

/**
 * The scrolling item region inside a menu panel. It owns the height policy, the
 * density axis, the edge fade, and the overflow watch, so neither call site
 * states them.
 *
 * @remarks
 * The mask fading the scroll edges lives here, not on the panel. Masking the
 * panel would dissolve its border and shadow with the content wherever a fade
 * is open.
 *
 * The watch is gated on `capped`, which is the flag that emits the `max-h`. An
 * uncapped viewport grows with its rows, so it never overflows, and the two
 * edge attributes cannot change. `browser/menu-scroll-overflow.test.tsx` pins
 * that invariant, and `__benchmarks__/browser/README.md` §Menus prices the gate.
 *
 * Density comes from the ambient token rather than a prop. {@link MenuContent}
 * renders this inside its own `Density`, and a submenu panel is a React child
 * of that provider, so both reach the same value.
 *
 * @internal
 */
export function MenuViewport({ ref, children }: MenuViewportProps) {
	const { space } = useDensity()

	const capped = useMenuCapped()

	const scrollOverflowRef = useScrollOverflow({ enabled: capped })

	// `useComposedRef` forwards each ref's own cleanup, which React 19 keeps from
	// the watch's callback ref. A hand-written wrapper that drops the return
	// leaves React nothing to run on detach.
	const setViewport = useComposedRef<HTMLElement>(ref, scrollOverflowRef)

	return (
		<div
			ref={setViewport}
			data-slot="menu-viewport"
			className={k.viewport({ density: space, capped })}
		>
			{children}
		</div>
	)
}
