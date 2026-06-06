'use client'

import { type ComponentPropsWithoutRef, useMemo } from 'react'
import { CurrentContext, type CurrentContextValue } from '../../primitives/current'

export type NavProps = Omit<ComponentPropsWithoutRef<'nav'>, 'onChange'> & {
	value?: string
	onValueChange?: (value: string | undefined) => void
}

/** Navigation landmark that broadcasts the active `value` to descendants via the current-item context. */
export function Nav({ value, onValueChange, className, children, ...props }: NavProps) {
	const context = useMemo<CurrentContextValue>(
		() => ({ value, onValueChange }),
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
