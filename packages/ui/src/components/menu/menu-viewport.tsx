'use client'

import type { ReactNode, Ref } from 'react'
import { k } from '../../recipes/kata/menu'
import { useMenuCapped } from './context'

/** Props for {@link MenuViewport}. */
type MenuViewportProps = {
	/**
	 * A ref the panel needs on the viewport node. {@link MenuSub} passes the
	 * state setter its focus-seating effect reads.
	 */
	ref?: Ref<HTMLDivElement>
	children: ReactNode
}

/**
 * The scrolling item region inside a menu panel. It owns the height policy and
 * the edge fade, so neither call site states them.
 *
 * @remarks
 * The mask fading the scroll edges lives here, not on the panel. Masking the
 * panel would dissolve its border and shadow with the content wherever a fade
 * is open.
 *
 * The fade is the `scroll-fade-block` utility, which scroll-driven animations
 * draw with no script. A viewport whose rows fit has no mask, so the fade needs
 * no gate. A browser without scroll-driven animations shows no fade.
 *
 * The height cap follows the nearest density scope. Each menu panel is a
 * density scope, so the viewport reads no context.
 *
 * @internal
 */
export function MenuViewport({ ref, children }: MenuViewportProps) {
	const capped = useMenuCapped()

	return (
		<div ref={ref} data-slot="menu-viewport" className={k({ capped }).viewport}>
			{children}
		</div>
	)
}
