'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { CurrentContext, useCurrentState } from '../../primitives/current'

/** Props for {@link Nav}: the active `value` and a change callback, plus native `<nav>` attributes (less `onChange`). */
export type NavProps = Omit<ComponentPropsWithoutRef<'nav'>, 'onChange'> & {
	/** Controlled active value. Pair with `onValueChange`. */
	value?: string | null
	/** Initial active value when uncontrolled. */
	defaultValue?: string
	onValueChange?: (value: string | null) => void
}

/** Navigation landmark that broadcasts the active `value` to descendants via the current-item context. */
export function Nav({
	value,
	defaultValue,
	onValueChange,
	className,
	children,
	...props
}: NavProps) {
	// Shares the current-item cascade with Tabs rather than hand-rolling the
	// context, so controlled and uncontrolled behave identically across both.
	const context = useCurrentState({ value, defaultValue, onValueChange })

	return (
		<CurrentContext value={context}>
			<nav data-slot="nav" className={className} {...props}>
				{children}
			</nav>
		</CurrentContext>
	)
}
