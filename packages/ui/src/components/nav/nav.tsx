'use client'

import type { ComponentProps } from 'react'
import { CurrentContext, useCurrentState } from '../../primitives/current'
import { CurrentStoreContext, useCurrentStore } from '../../primitives/current/current'

/** Props for {@link Nav}: the active `value` and a change callback, plus native `<nav>` attributes (less `onChange`). */
export type NavProps = Omit<ComponentProps<'nav'>, 'onChange'> & {
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

	// Each item reads its own value from the store, so a change renders only the
	// item that stops being current and the item that becomes current.
	const store = useCurrentStore(context)

	return (
		<CurrentContext value={context}>
			<CurrentStoreContext value={store}>
				<nav data-slot="nav" className={className} {...props}>
					{children}
				</nav>
			</CurrentStoreContext>
		</CurrentContext>
	)
}
