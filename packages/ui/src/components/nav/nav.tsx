'use client'

import { type ComponentPropsWithoutRef, useMemo } from 'react'
import { CurrentContext, type CurrentContextValue } from '../../primitives/current'

/** Props for {@link Nav}: the active `value` and a change callback, plus native `<nav>` attributes (less `onChange`). */
export type NavProps = Omit<ComponentPropsWithoutRef<'nav'>, 'onChange'> & {
	value?: string | null
	onValueChange?: (value: string | null) => void
}

/** Navigation landmark that broadcasts the active `value` to descendants via the current-item context. */
export function Nav({ value, onValueChange, className, children, ...props }: NavProps) {
	const context = useMemo<CurrentContextValue>(
		() => ({ value: value ?? undefined, onValueChange }),
		[value, onValueChange],
	)

	return (
		<CurrentContext value={context}>
			<nav data-slot="nav" className={className} {...props}>
				{children}
			</nav>
		</CurrentContext>
	)
}
